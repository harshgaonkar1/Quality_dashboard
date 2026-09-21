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
const { indexToColumnLetter, validateHeaders, validateRow } = require('../middlewares/validateUpload');

/**
 * Reads the first worksheet of an Excel file and converts every row
 * into a JSON object using the header row as keys, attaching cell addresses
 * (e.g. D14, A2) and column letters to enable precise cell-level error tracking.
 *
 * @param {string} filePath - path to the uploaded Excel file on disk
 * @returns {Promise<{rows: object[], invalidRows: object[], totalRows: number, sheetName: string, headers: object[], allWorksheets: string[]}>}
 */
async function readExcelFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheets = workbook.worksheets || [];
  if (worksheets.length === 0) {
    throw new Error('The uploaded Excel file has no worksheets.');
  }

  const allWorksheets = worksheets.map((ws) => ws.name);
  const worksheet = worksheets[0];
  const sheetName = worksheet.name || 'Sheet1';

  // Extract header row
  const rawHeaderValues = worksheet.getRow(1).values.slice(1); // ExcelJS rows are 1-indexed with a leading empty slot
  const { valid, missingColumns } = validateHeaders(rawHeaderValues);
  if (!valid) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const headers = [];
  const normalizedHeaders = [];
  const headerMeta = {};

  rawHeaderValues.forEach((h, idx) => {
    const colIndex = idx + 1;
    const colLetter = indexToColumnLetter(colIndex);
    const headerName = String(h || '').trim();
    if (headerName) {
      normalizedHeaders.push(headerName);
      headers.push({ header: headerName, colLetter, colIndex });
      headerMeta[headerName] = { colIndex, colLetter };
    }
  });

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
    const cellMap = {};
    const colLetters = {};

    normalizedHeaders.forEach((header, idx) => {
      let cellValue = values[idx];
      const colLetter = headerMeta[header]?.colLetter || indexToColumnLetter(idx + 1);
      const cellAddress = `${colLetter}${rowNumber}`;

      cellMap[header] = cellAddress;
      colLetters[header] = colLetter;

      // ExcelJS may return rich-text or formula-result objects; normalize to plain values
      if (cellValue && typeof cellValue === 'object') {
        if ('result' in cellValue) {
          cellValue = cellValue.result;
        } else if ('text' in cellValue) {
          cellValue = cellValue.text;
        } else if ('richText' in cellValue && Array.isArray(cellValue.richText)) {
          cellValue = cellValue.richText.map((t) => t.text).join('');
        }
      }

      rowObject[header] = cellValue === undefined ? null : cellValue;
    });

    // Attach cell mapping and metadata as non-enumerable properties
    Object.defineProperties(rowObject, {
      _cellMap: { value: cellMap, writable: true, enumerable: false },
      _colLetters: { value: colLetters, writable: true, enumerable: false },
      _sheetName: { value: sheetName, writable: true, enumerable: false },
      _rowNumber: { value: rowNumber, writable: true, enumerable: false },
    });

    const validation = validateRow(rowObject);
    if (!validation.valid) {
      invalidRows.push({
        rowNumber,
        sheetName,
        reason: validation.reason,
        data: rowObject,
        cellErrors: [
          {
            table: null,
            sheetName,
            cell: `A${rowNumber}`,
            colLetter: 'A',
            colName: 'Row',
            rowNumber,
            errorType: 'INVALID_ROW',
            value: '(empty)',
            expected: 'Non-empty data row',
            message: `Row ${rowNumber} is invalid: ${validation.reason}`,
            suggestedFix: 'Review or remove empty / corrupted rows in Excel.',
          },
        ],
      });
    } else {
      rows.push({
        rowNumber,
        sheetName,
        data: rowObject,
        cellMap,
      });
    }
  });

  return {
    rows,
    invalidRows,
    totalRows,
    sheetName,
    headers,
    allWorksheets,
  };
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

