// ============================================================
// Upload Controller
// ------------------------------------------------------------
// Handles POST /api/upload. Accepts two files (productReplacement,
// partReplacement), parses each with excelService, computes Ageing
// via ageingService, and persists via uploadPersistenceService.
//
// NOTE: This endpoint is only used for the initial data-loading
// phase. Once the app is fully wired to MySQL, this route can be
// disabled without touching any dashboard read logic, since the
// dashboard NEVER reads Excel directly.
// ============================================================

const { readExcelFile, cleanupFile } = require('../services/excelService');
const { processRows } = require('../services/ageingService');
const { batchInsert, logUpload } = require('../services/uploadPersistenceService');
const { success, error } = require('../utils/responseHandler');

/**
 * Processes a single uploaded file end-to-end: read -> validate -> transform -> persist -> log.
 */
async function handleSingleFileUpload(file, uploadType) {
  const { rows, invalidRows, totalRows } = await readExcelFile(file.path);
  const { records, skipped } = processRows(rows, uploadType);
  const { insertedRows, duplicateRows } = await batchInsert(uploadType, records);

  const allSkipped = [...invalidRows, ...skipped];
  const status = allSkipped.length === 0 ? 'SUCCESS' : (insertedRows > 0 ? 'PARTIAL' : 'FAILED');

  await logUpload({
    uploadType,
    fileName: file.originalname,
    totalRows,
    insertedRows,
    skippedRows: allSkipped.length,
    duplicateRows,
    errorRows: invalidRows.length,
    status,
    errorDetails: allSkipped.length > 0 ? allSkipped.slice(0, 50) : null, // cap stored detail size
  });

  // Save permanent copy of uploaded file to backend/uploads/
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const savedFileName = `${uploadType.toLowerCase()}_${Date.now()}_${file.originalname}`;
  const savedFilePath = path.join(uploadsDir, savedFileName);
  try {
    fs.copyFileSync(file.path, savedFilePath);
  } catch (copyErr) {
    console.warn('Could not save permanent copy of uploaded file:', copyErr.message);
  }

  cleanupFile(file.path);

  return {
    fileName: file.originalname,
    totalRows,
    insertedRows,
    duplicateRows,
    skippedRows: allSkipped.length,
    status,
    skippedDetails: allSkipped.slice(0, 20), // return a sample to the client
  };
}

/**
 * POST /api/upload
 * Expects multipart/form-data with fields:
 *   productReplacement (file, optional)
 *   partReplacement (file, optional)
 * At least one file must be provided.
 */
async function uploadFiles(req, res, next) {
  try {
    const files = req.files || {};
    const productFile = files.productReplacement?.[0];
    const partFile = files.partReplacement?.[0];

    if (!productFile && !partFile) {
      return error(res, 'Please upload at least one file: productReplacement or partReplacement.', 400);
    }

    const results = {};

    if (productFile) {
      results.productReplacement = await handleSingleFileUpload(productFile, 'PRODUCT_REPLACEMENT');
    }
    if (partFile) {
      results.partReplacement = await handleSingleFileUpload(partFile, 'PART_REPLACEMENT');
    }

    return success(res, results, 'Upload processed successfully');
  } catch (err) {
    // Clean up any files that were saved before the error occurred
    const files = req.files || {};
    Object.values(files).flat().forEach((f) => cleanupFile(f.path));
    next(err);
  }
}

module.exports = { uploadFiles };
