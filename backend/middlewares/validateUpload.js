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
  const normalizedHeaders = headerRow.map((h) => String(h || '').trim().toLowerCase());
  const missingColumns = [];

  for (const group of REQUIRED_COLUMN_GROUPS) {
    const matched = group.aliases.some((alias) => normalizedHeaders.includes(alias.toLowerCase()));
    if (!matched) {
      missingColumns.push(group.name);
    }
  }

  return {
    valid: missingColumns.length === 0,
    missingColumns,
  };
}

/**
 * Validates a single parsed row object for critical values and mandatory filters.
 * Mandatory Filters:
 *  - mat cat: WM or WD
 *  - machine status: SW or SUW
 *  - fd zbrn status: Approved or Approved for Upgrade
 *  - type of damage: Functional
 * Returns { valid: boolean, reason: string|null }
 */
function validateRow(row) {
  const complaintNumber = getFieldValue(row, [
    'ZMAC ID', 'ZMAC_ID', 'ZMACID', 'Complaint Number', 'Complaint No', 'Complaint'
  ]);
  if (!complaintNumber) {
    return { valid: false, reason: 'Missing ZMAC ID / Complaint Number' };
  }

  const matCat = getFieldValue(row, [
    'mat cat', 'Mat Cat', 'MAT CAT', 'mat_cat', 'Material Category', 'Mat_Cat'
  ]);
  const normalizedMatCat = matCat ? matCat.toUpperCase() : '';
  if (normalizedMatCat !== 'WM' && normalizedMatCat !== 'WD') {
    return {
      valid: false,
      reason: `Filtered out mat cat '${matCat || ''}' (only WM and WD allowed)`,
    };
  }

  const machineStatus = getFieldValue(row, [
    'machine status', 'Machine Status', 'MACHINE STATUS', 'machine_status', 'Status'
  ]);
  const normalizedMachineStatus = machineStatus ? machineStatus.toUpperCase() : '';
  if (normalizedMachineStatus !== 'SW' && normalizedMachineStatus !== 'SUW') {
    return {
      valid: false,
      reason: `Filtered out machine status '${machineStatus || ''}' (only SW and SUW allowed)`,
    };
  }

  const fdZbrnStatus = getFieldValue(row, [
    'FD ZBRN STATUS', 'fd zbrn status', 'ZBRN Status', 'Status'
  ]);
  const normalizedFdZbrnStatus = fdZbrnStatus ? fdZbrnStatus.trim().toLowerCase() : '';
  if (normalizedFdZbrnStatus !== 'approved' && normalizedFdZbrnStatus !== 'approved for upgrade') {
    return {
      valid: false,
      reason: `Filtered out fd zbrn status '${fdZbrnStatus || ''}' (only Approved and Approved for Upgrade allowed)`,
    };
  }

  const typeOfDamage = getFieldValue(row, [
    'TYPE OF DAMAGE', 'type of damage', 'Damage Type'
  ]);
  const normalizedTypeOfDamage = typeOfDamage ? typeOfDamage.trim().toLowerCase() : '';
  if (normalizedTypeOfDamage !== 'functional') {
    return {
      valid: false,
      reason: `Filtered out type of damage '${typeOfDamage || ''}' (only Functional allowed)`,
    };
  }

  const doi = getFieldValue(row, ['DOI', 'Date of Installation', 'Installation Date']);
  if (!doi) {
    return { valid: false, reason: 'Missing DOI (Date of Installation)' };
  }

  const doc = getFieldValue(row, [
    'ticket posting date', 'DOC', 'Date of Complaint', 'Complaint Date', 'Posting Date'
  ]);
  if (!doc) {
    return { valid: false, reason: 'Missing DOC / Ticket Posting Date' };
  }

  return { valid: true, reason: null };
}

module.exports = { REQUIRED_COLUMN_GROUPS, validateHeaders, validateRow, getFieldValue };
