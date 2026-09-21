// ============================================================
// Upload Controller
// ------------------------------------------------------------
// Handles Excel upload with 2-step flow:
// 1. Validate & Inspect (dry-run): parses Excel, extracts exact cell
//    coordinates (D14, A2), validates date formats & business rules,
//    returns visual preview without inserting into the database.
// 2. Commit: only inserts records into MySQL/Supabase when the user
//    explicitly confirms and clicks the upload button.
// ============================================================

const fs = require('fs');
const path = require('path');
const { readExcelFile, cleanupFile } = require('../services/excelService');
const { processRows } = require('../services/ageingService');
const { batchInsert, logUpload } = require('../services/uploadPersistenceService');
const { success, error } = require('../utils/responseHandler');

// Temporary in-memory cache for validated upload sessions (expires in 30 minutes)
const uploadSessions = new Map();

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, sess] of uploadSessions.entries()) {
    if (now - sess.createdAt > 30 * 60 * 1000) {
      if (sess.filePath) cleanupFile(sess.filePath);
      uploadSessions.delete(token);
    }
  }
}

/**
 * Validates a single uploaded file (dry-run): read -> validate -> transform -> cache session.
 */
async function validateSingleFileUpload(file, uploadType) {
  const { rows, invalidRows, totalRows, sheetName, headers, allWorksheets } = await readExcelFile(file.path);
  const { records, skipped, filteredCount, cellErrors, errorBreakdown } = processRows(rows, uploadType);

  // Combine invalid rows from read phase with business rule skipped rows
  const allInvalidCellErrors = [];
  invalidRows.forEach((inv) => {
    if (inv.cellErrors) {
      allInvalidCellErrors.push(...inv.cellErrors);
    }
  });

  const allCellErrors = [...allInvalidCellErrors, ...cellErrors];
  const allSkipped = [...invalidRows, ...skipped];
  const status = allCellErrors.length === 0 ? 'SUCCESS' : (records.length > 0 ? 'PARTIAL' : 'FAILED');

  // Build a preview sample of rows (up to 80 rows, prioritizing error rows)
  const errorRowNumbers = new Set(allSkipped.map((s) => s.rowNumber));
  const errorRowsSample = rows.filter((r) => errorRowNumbers.has(r.rowNumber));
  const validRowsSample = rows.filter((r) => !errorRowNumbers.has(r.rowNumber)).slice(0, Math.max(0, 50 - errorRowsSample.length));
  const previewRows = [...errorRowsSample, ...validRowsSample].map((r) => ({
    rowNumber: r.rowNumber,
    hasError: errorRowNumbers.has(r.rowNumber),
    data: r.data,
  })).sort((a, b) => a.rowNumber - b.rowNumber);

  // Generate session token to allow committing without re-uploading file
  const sessionToken = `sess_${uploadType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Cache session
  cleanExpiredSessions();
  uploadSessions.set(sessionToken, {
    createdAt: Date.now(),
    uploadType,
    fileName: file.originalname,
    filePath: file.path,
    records,
    allSkipped,
    invalidRows,
    totalRows,
    sheetName,
    headers,
    allCellErrors,
    errorBreakdown,
    filteredRows: filteredCount || 0,
    status,
  });

  return {
    sessionToken,
    validationOnly: true,
    fileName: file.originalname,
    sheetName: sheetName || 'Sheet1',
    allWorksheets: allWorksheets || [sheetName || 'Sheet1'],
    uploadType,
    totalRows,
    validRecordsCount: records.length,
    insertedRows: 0,
    duplicateRows: 0,
    skippedRows: allSkipped.length,
    filteredRows: filteredCount || 0,
    status,
    headers: headers || [],
    cellErrors: allCellErrors,
    errorBreakdown: {
      ...errorBreakdown,
      totalCellErrors: allCellErrors.length,
    },
    skippedDetails: allSkipped.slice(0, 50),
    previewRows,
  };
}

/**
 * Commits a validated session into database.
 */
async function commitSession(sessionToken) {
  const session = uploadSessions.get(sessionToken);
  if (!session) {
    throw new Error('Validation session expired or not found. Please validate the file again.');
  }

  const { uploadType, fileName, filePath, records, allSkipped, invalidRows, totalRows, allCellErrors, filteredRows, status: initialStatus } = session;
  const { insertedRows, duplicateRows } = await batchInsert(uploadType, records);
  const status = allSkipped.length === 0 ? 'SUCCESS' : (insertedRows > 0 ? 'PARTIAL' : 'FAILED');

  await logUpload({
    uploadType,
    fileName,
    totalRows,
    insertedRows,
    skippedRows: allSkipped.length,
    duplicateRows,
    errorRows: invalidRows.length + allSkipped.length,
    status,
    errorDetails: allCellErrors.length > 0 ? allCellErrors.slice(0, 100) : null,
  });

  // Save permanent copy
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const savedFileName = `${uploadType.toLowerCase()}_${Date.now()}_${fileName}`;
  const savedFilePath = path.join(uploadsDir, savedFileName);
  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, savedFilePath);
      cleanupFile(filePath);
    }
  } catch (copyErr) {
    console.warn('Could not save permanent copy of uploaded file:', copyErr.message);
  }

  uploadSessions.delete(sessionToken);

  return {
    committed: true,
    validationOnly: false,
    fileName,
    uploadType,
    sheetName: session.sheetName || 'Sheet1',
    headers: session.headers || [],
    previewRows: session.previewRows || [],
    cellErrors: session.allCellErrors || [],
    errorBreakdown: session.errorBreakdown || {},
    totalRows,
    insertedRows,
    duplicateRows,
    skippedRows: allSkipped.length,
    filteredRows: filteredRows || 0,
    status,
  };
}

/**
 * POST /api/upload
 * Accepts multipart/form-data.
 * If query param ?validateOnly=true is provided, performs validation and inspection only.
 */
async function uploadFiles(req, res, next) {
  try {
    const isValidateOnly = req.query.validateOnly === 'true' || req.body.validateOnly === 'true' || req.body.validateOnly === true;
    const files = req.files || {};
    const productFile = files.productReplacement?.[0];
    const partFile = files.partReplacement?.[0];
    const groupingFile = files.partGrouping?.[0];

    if (!productFile && !partFile && !groupingFile) {
      return error(res, 'Please select at least one file: productReplacement, partReplacement, or partGrouping.', 400);
    }

    const results = {};

    if (isValidateOnly) {
      // Step 1: Validate and inspect without committing to DB
      if (productFile) {
        results.productReplacement = await validateSingleFileUpload(productFile, 'PRODUCT_REPLACEMENT');
      }
      if (partFile) {
        results.partReplacement = await validateSingleFileUpload(partFile, 'PART_REPLACEMENT');
      }
      if (groupingFile) {
        results.partGrouping = await validateSingleFileUpload(groupingFile, 'PART_GROUPING');
      }

      return success(res, results, 'Files validated successfully. Review errors or click Confirm to upload.');
    }

    // Direct Commit flow (if not validateOnly)
    if (productFile) {
      const val = await validateSingleFileUpload(productFile, 'PRODUCT_REPLACEMENT');
      results.productReplacement = await commitSession(val.sessionToken);
      results.productReplacement.cellErrors = val.cellErrors;
      results.productReplacement.headers = val.headers;
      results.productReplacement.previewRows = val.previewRows;
    }
    if (partFile) {
      const val = await validateSingleFileUpload(partFile, 'PART_REPLACEMENT');
      results.partReplacement = await commitSession(val.sessionToken);
      results.partReplacement.cellErrors = val.cellErrors;
      results.partReplacement.headers = val.headers;
      results.partReplacement.previewRows = val.previewRows;
    }
    if (groupingFile) {
      const val = await validateSingleFileUpload(groupingFile, 'PART_GROUPING');
      results.partGrouping = await commitSession(val.sessionToken);
      results.partGrouping.cellErrors = val.cellErrors;
      results.partGrouping.headers = val.headers;
      results.partGrouping.previewRows = val.previewRows;
    }

    return success(res, results, 'Upload processed and saved successfully');
  } catch (err) {
    const files = req.files || {};
    Object.values(files).flat().forEach((f) => cleanupFile(f.path));
    next(err);
  }
}

/**
 * POST /api/upload/commit
 * Commits previously validated sessions by token.
 */
async function commitUpload(req, res, next) {
  try {
    const sessionTokens = req.body.sessionTokens || {};
    const tokenList = Object.entries(sessionTokens);

    if (tokenList.length === 0) {
      return error(res, 'No session tokens provided for commit.', 400);
    }

    const results = {};
    for (const [key, token] of tokenList) {
      if (token) {
        results[key] = await commitSession(token);
      }
    }

    return success(res, results, 'Files successfully saved to the database.');
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFiles, commitUpload };


