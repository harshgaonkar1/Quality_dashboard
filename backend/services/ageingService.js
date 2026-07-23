// ============================================================
// Ageing / Data Processing Service
// ------------------------------------------------------------
// Transforms a raw parsed Excel row into a clean record ready
// for MySQL insertion: normalizes dates, computes the Ageing
// column (DOC - DOI in days), applies business filters (mat cat
// & machine status), and deduplicates by Complaint Number / ZMAC ID.
// ============================================================

const { parseFlexibleDate, toMySQLDate, calculateAgeingDays } = require('../utils/dateUtils');
const { getFieldValue } = require('../middlewares/validateUpload');

/**
 * Processes an array of { rowNumber, data } raw row objects into
 * clean records ready for insertion, plus a report of what was
 * skipped and why.
 *
 * @param {Array<{rowNumber:number, data:object}>} rawRows
 * @returns {{ records: object[], skipped: object[] }}
 */
function processRows(rawRows) {
  const records = [];
  const skipped = [];
  const seenComplaintNumbers = new Set();

  for (const { rowNumber, data } of rawRows) {
    const complaintNumber = getFieldValue(data, [
      'ZMAC ID', 'ZMAC_ID', 'ZMACID', 'Complaint Number', 'Complaint No', 'Complaint',
    ]);

    if (!complaintNumber) {
      skipped.push({ rowNumber, reason: 'Missing ZMAC ID / Complaint Number', complaintNumber: null });
      continue;
    }

    // Duplicate complaint numbers WITHIN the same file are dropped;
    // duplicates against the database are handled at the insert layer (INSERT IGNORE).
    if (seenComplaintNumbers.has(complaintNumber)) {
      skipped.push({ rowNumber, reason: 'Duplicate Complaint Number within file', complaintNumber });
      continue;
    }

    // Filter 1: mat cat must be WM or WD
    const matCat = getFieldValue(data, [
      'mat cat', 'Mat Cat', 'MAT CAT', 'mat_cat', 'Material Category', 'Mat_Cat',
    ]);
    const normalizedMatCat = matCat ? matCat.toUpperCase() : '';
    if (normalizedMatCat !== 'WM' && normalizedMatCat !== 'WD') {
      skipped.push({
        rowNumber,
        reason: `Filtered out mat cat '${matCat || ''}' (only WM and WD allowed)`,
        complaintNumber,
      });
      continue;
    }

    // Filter 2: machine status must be SW or SUW
    const machineStatus = getFieldValue(data, [
      'machine status', 'Machine Status', 'MACHINE STATUS', 'machine_status', 'Status',
    ]);
    const normalizedMachineStatus = machineStatus ? machineStatus.toUpperCase() : '';
    if (normalizedMachineStatus !== 'SW' && normalizedMachineStatus !== 'SUW') {
      skipped.push({
        rowNumber,
        reason: `Filtered out machine status '${machineStatus || ''}' (only SW and SUW allowed)`,
        complaintNumber,
      });
      continue;
    }

    // Filter 3: FD ZBRN STATUS must be Approved or Approved for Upgrade
    const fdZbrnStatus = getFieldValue(data, [
      'FD ZBRN STATUS', 'fd zbrn status', 'ZBRN Status', 'Status',
    ]);
    const normalizedFdZbrnStatus = fdZbrnStatus ? fdZbrnStatus.trim().toLowerCase() : '';
    if (normalizedFdZbrnStatus !== 'approved' && normalizedFdZbrnStatus !== 'approved for upgrade') {
      skipped.push({
        rowNumber,
        reason: `Filtered out FD ZBRN STATUS '${fdZbrnStatus || ''}' (only Approved and Approved for Upgrade allowed)`,
        complaintNumber,
      });
      continue;
    }

    // Filter 4: TYPE OF DAMAGE must be Functional
    const typeOfDamage = getFieldValue(data, [
      'TYPE OF DAMAGE', 'type of damage', 'Damage Type',
    ]);
    const normalizedTypeOfDamage = typeOfDamage ? typeOfDamage.trim().toLowerCase() : '';
    if (normalizedTypeOfDamage !== 'functional') {
      skipped.push({
        rowNumber,
        reason: `Filtered out TYPE OF DAMAGE '${typeOfDamage || ''}' (only Functional allowed)`,
        complaintNumber,
      });
      continue;
    }

    // Dates: DOI and DOC (ticket posting date)
    const rawDoi = getFieldValue(data, ['DOI', 'Date of Installation', 'Installation Date']);
    const rawDoc = getFieldValue(data, [
      'ticket posting date', 'DOC', 'Date of Complaint', 'Complaint Date', 'Posting Date',
    ]);

    const doiDate = parseFlexibleDate(rawDoi);
    const docDate = parseFlexibleDate(rawDoc);

    if (!doiDate) {
      skipped.push({ rowNumber, reason: 'Invalid or unparseable DOI date', complaintNumber });
      continue;
    }
    if (!docDate) {
      skipped.push({ rowNumber, reason: 'Invalid or unparseable DOC / ticket posting date', complaintNumber });
      continue;
    }

    const ageingDays = calculateAgeingDays(doiDate, docDate);
    if (ageingDays === null) {
      skipped.push({
        rowNumber,
        reason: 'DOC is earlier than DOI (invalid date range)',
        complaintNumber,
      });
      continue;
    }

    seenComplaintNumbers.add(complaintNumber);

    const model = getFieldValue(data, [
      'Product Description', 'PRODUCT DESCRIPTION', 'Product_Description', 'Model', 'Model Name',
    ]);
    const branch = getFieldValue(data, [
      'branch', 'Branch', 'BRANCH', 'ZBRN', 'Branch Name', 'Branch_Name',
    ]);
    const serialNumber = getFieldValue(data, ['Serial Number', 'serial number', 'Serial No', 'Serial_Number']);
    const partNumber = getFieldValue(data, ['Part Number', 'part number', 'Part No']);
    const partName = getFieldValue(data, ['Part Name', 'part name']);

    records.push({
      complaint_number: complaintNumber,
      model: model || null,
      branch: branch || null,
      mat_cat: normalizedMatCat || null,
      machine_status: normalizedMachineStatus || null,
      serial_number: serialNumber || null,
      part_number: partNumber || null,
      part_name: partName || null,
      doi: toMySQLDate(doiDate),
      doc: toMySQLDate(docDate),
      ageing_days: ageingDays,
      fd_zbrn_status: fdZbrnStatus || null,
      type_of_damage: typeOfDamage || null,
      raw_payload: JSON.stringify(data),
    });
  }

  return { records, skipped };
}

module.exports = { processRows };
