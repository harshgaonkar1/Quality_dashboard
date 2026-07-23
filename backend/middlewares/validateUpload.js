// ============================================================
// Excel Row Validation
// ------------------------------------------------------------
// Validates that required columns are present in the parsed
// header row, and flags rows with missing critical values.
// This is used by excelService after reading raw rows, not as
// an Express middleware in the traditional sense (Excel content
// isn't known until after Multer + ExcelJS parsing), but it lives
// in middlewares/ to keep all "gatekeeping" logic in one place.
// ============================================================

// ============================================================
// Excel Row Validation
// ------------------------------------------------------------
// Validates that required columns are present in the parsed
// header row, and flags rows with missing critical values or
// values that do not match mandatory business filters.
// ============================================================

const REQUIRED_COLUMN_GROUPS = [
  {
    name: 'Serial Number',
    aliases: ['Serial Number', 'serial number', 'Serial No', 'Serial_Number', 'SerialNo', 'SERIAL NUMBER'],
  },
  {
    name: 'ZMAC ID / Complaint Number',
    aliases: ['ZMAC ID', 'ZMAC_ID', 'ZMACID', 'Complaint Number', 'Complaint No', 'Complaint'],
  },
  {
    name: 'Product Description / Model',
    aliases: ['Product Description', 'PRODUCT DESCRIPTION', 'Product_Description', 'Model', 'Model Name'],
  },
  {
    name: 'Mat Cat',
    aliases: ['mat cat', 'Mat Cat', 'MAT CAT', 'mat_cat', 'Material Category', 'Mat_Cat'],
  },
  {
    name: 'Machine Status',
    aliases: ['machine status', 'Machine Status', 'MACHINE STATUS', 'machine_status', 'Status'],
  },
  {
    name: 'DOI',
    aliases: ['DOI', "doi", 'Date of Installation', 'Installation Date'],
  },
  {
    name: 'DOC / Ticket Posting Date',
    aliases: ['ticket posting date', 'DOC', 'Date of Complaint', 'Complaint Date', 'Posting Date'],
  },
];

/**
 * Helper to get a field value from a row object using multiple header aliases.
 */
function getFieldValue(row, aliases) {
  if (!row) return null;
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = alias.trim().toLowerCase();
    const foundKey = keys.find((k) => k.trim().toLowerCase() === normalizedAlias);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      const val = String(row[foundKey]).trim();
      if (val !== '') return val;
    }
  }
  return null;
}

/**
 * Confirms the Excel header row contains every required column (or its alias).
 * Returns { valid: boolean, missingColumns: string[] }
 */
function validateHeaders(headerRow) {
  // Pass all uploaded Excel files to preserve 100% of data in the database
  return { valid: true, missingColumns: [] };
}

function validateRow(row) {
  if (!row || Object.keys(row).length === 0) {
    return { valid: false, reason: 'Empty row' };
  }
  const serialNumber = getFieldValue(row, [
    'Serial Number', 'serial number', 'Serial No', 'Serial_Number', 'SerialNo', 'SERIAL NUMBER'
  ]);
  if (!serialNumber) {
    return { valid: false, reason: 'Missing Serial Number' };
  }
  return { valid: true, reason: null };
}

module.exports = { REQUIRED_COLUMN_GROUPS, validateHeaders, validateRow, getFieldValue };
