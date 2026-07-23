// ============================================================
// Excel Service
// ------------------------------------------------------------
// Responsible for reading .xlsx/.xls files with ExcelJS and
// converting each row into a plain JSON object keyed by header
// name. Pure I/O + parsing concerns live here; business rules
// (ageing calculation, filtering) live in their own services.
// ============================================================

const ExcelJS = require('exceljs');
const fs = require('fs');
const { validateHeaders, validateRow } = require('../middlewares/validateUpload');

/**
 * Reads the first worksheet of an Excel file and converts every row
 * into a JSON object using the header row as keys.
 *
 * @param {string} filePath - path to the uploaded Excel file on disk
 * @returns {Promise<{rows: object[], invalidRows: object[], totalRows: number}>}
 */
async function readExcelFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('The uploaded Excel file has no worksheets.');
  }

  // Extract and validate header row
  const headerRow = worksheet.getRow(1).values.slice(1); // ExcelJS rows are 1-indexed with a leading empty slot
  const { valid, missingColumns } = validateHeaders(headerRow);
  if (!valid) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const normalizedHeaders = headerRow.map((h) => String(h || '').trim());

  const rows = [];
  const invalidRows = [];
  let totalRows = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const values = row.values.slice(1);
    // Skip fully empty rows
    const isEmptyRow = values.every((v) => v === null || v === undefined || String(v).trim() === '');
    if (isEmptyRow) return;

    totalRows += 1;

    const rowObject = {};
    normalizedHeaders.forEach((header, idx) => {
      let cellValue = values[idx];
      // ExcelJS may return rich-text or formula-result objects; normalize to plain values
      if (cellValue && typeof cellValue === 'object' && 'result' in cellValue) {
        cellValue = cellValue.result;
      }
      if (cellValue && typeof cellValue === 'object' && 'text' in cellValue) {
        cellValue = cellValue.text;
      }
      rowObject[header] = cellValue === undefined ? null : cellValue;
    });

    const validation = validateRow(rowObject);
    if (!validation.valid) {
      invalidRows.push({ rowNumber, reason: validation.reason, data: rowObject });
    } else {
      rows.push({ rowNumber, data: rowObject });
    }
  });

  return { rows, invalidRows, totalRows };
}

/**
 * Deletes the temporary uploaded file from disk after processing.
 * Wrapped in try/catch so a cleanup failure never crashes the request.
 */
function cleanupFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) console.warn(`⚠️ Could not delete temp file ${filePath}:`, err.message);
  });
}

module.exports = { readExcelFile, cleanupFile };
