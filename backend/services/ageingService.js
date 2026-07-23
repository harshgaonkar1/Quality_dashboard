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
  const seenSerialNumbers = new Set();

  for (const { rowNumber, data } of rawRows) {
    const serialNumber = getFieldValue(data, ['serial number', 'Serial Number', 'Serial No', 'Serial_Number', 'SerialNo', 'SERIAL NUMBER']);
    const complaintNumber = getFieldValue(data, ['ZMAC ID', 'ZMAC_ID', 'ZMACID', 'Complaint Number', 'Complaint No', 'Complaint']);

    if (!serialNumber) {
      skipped.push({ rowNumber, reason: 'Missing Serial Number', complaintNumber: complaintNumber || null, serialNumber: null });
      continue;
    }

    if (seenSerialNumbers.has(serialNumber)) {
      skipped.push({ rowNumber, reason: 'Duplicate Serial Number within file', complaintNumber: complaintNumber || null, serialNumber });
      continue;
    }

    seenSerialNumbers.add(serialNumber);
    const rawZmacDate = getFieldValue(data, ['zmac date', 'ZMAC Date', 'zmac_date']);
    const zmacStatus = getFieldValue(data, ['zmac status', 'ZMAC Status', 'zmac_status']);
    
    const fdZbrnId = getFieldValue(data, ['fd zbrn id', 'FD ZBRN ID', 'fd_zbrn_id']);
    const fdZbrnStatus = getFieldValue(data, ['fd zbrn status', 'FD ZBRN STATUS', 'ZBRN Status', 'Status']);
    const rawFdZbrnDate = getFieldValue(data, ['fd zbrn date', 'FD ZBRN Date', 'fd_zbrn_date']);

    const customerFirstName = getFieldValue(data, ['customer first name', 'Customer First Name', 'Customer Name', 'customer_first_name']);
    const city = getFieldValue(data, ['city', 'City', 'CITY']);
    const franchiseeId = getFieldValue(data, ['franchisee id', 'Franchisee ID', 'franchisee_id']);
    const franchiseeName = getFieldValue(data, ['franchisee name', 'Franchisee Name', 'franchisee_name']);
    const branch = getFieldValue(data, ['branch name', 'Branch Name', 'branch', 'Branch', 'BRANCH', 'ZBRN', 'Branch_Name']);

    const rawDoc = getFieldValue(data, ['ticket posting date', 'Ticket Posting Date', 'DOC', 'Date of Complaint', 'Complaint Date', 'Posting Date']);
    const ticketNo = getFieldValue(data, ['ticket no', 'Ticket No', 'ticket_no', 'Ticket Number']);
    const callType = getFieldValue(data, ['call type', 'Call Type', 'call_type']);
    const machineStatus = getFieldValue(data, ['machine status', 'Machine Status', 'MACHINE STATUS', 'machine_status', 'Status']);
    const normalizedMachineStatus = machineStatus ? machineStatus.toUpperCase() : null;

    const rawDop = getFieldValue(data, ['dop', 'DOP', 'Date of Purchase']);
    const rawDoi = getFieldValue(data, ['doi', 'DOI', 'Date of Installation', 'Installation Date']);
    
    const technicianName = getFieldValue(data, ['technician name', 'Technician Name', 'technician_name']);
    const technicianNo = getFieldValue(data, ['technician no', 'Technician No', 'technician_no', 'Technician Number']);
    const matCat = getFieldValue(data, ['mat cat', 'Mat Cat', 'MAT CAT', 'mat_cat', 'Material Category', 'Mat_Cat']);
    const normalizedMatCat = matCat ? matCat.toUpperCase() : null;

    const productId = getFieldValue(data, ['product id', 'Product ID', 'product_id']);
    const model = getFieldValue(data, ['product description', 'Product Description', 'PRODUCT DESCRIPTION', 'Product_Description', 'Model', 'Model Name']);
    const surveyOrigin = getFieldValue(data, ['survey origin', 'Survey Origin', 'SURVEY ORIGIN', 'Survey_Origin', 'SurveyOrigin']);
    const typeOfDamage = getFieldValue(data, ['type of damage', 'TYPE OF DAMAGE', 'Damage Type']);
    const customerComplaint = getFieldValue(data, ['customer complaint', 'Customer Complaint', 'CUSTOMER COMPLAINT', 'Customer_Complaint', 'CustomerComplaint', 'Complaint Description']);

    const partDescription = getFieldValue(data, ['spare desc', 'Spare Desc', 'SPARE DESC', 'Spare Description', 'spare description', 'SPARE DESCRIPTION', 'Spare_Desc', 'SpareDesc', 'Part Description', 'part description']);
    const partCode = getFieldValue(data, ['spare', 'Spare', 'SPARE', 'Spare Code', 'spare code', 'SPARE CODE', 'Spare_Code', 'SpareCode', 'Part Code', 'part code']);
    const partNumber = getFieldValue(data, ['Part Number', 'part number', 'Part No']);
    const partName = getFieldValue(data, ['Part Name', 'part name']);

    const outBoundDel = getFieldValue(data, ['out bound del', 'Out Bound Del', 'out_bound_del']);
    const rawOutBoundDelDate = getFieldValue(data, ['out bound del date', 'Out Bound Del Date', 'out_bound_del_date']);
    const dealerCode = getFieldValue(data, ['dealer code', 'Dealer Code', 'dealer_code']);
    const dealerName = getFieldValue(data, ['dealer name', 'Dealer Name', 'dealer_name']);
    const bseName = getFieldValue(data, ['BSE Name', 'bse name', 'BSE_Name', 'bse_name']);
    const industry = getFieldValue(data, ['Industry', 'industry', 'INDUSTRY']);

    const zmacDate = parseFlexibleDate(rawZmacDate);
    const fdZbrnDate = parseFlexibleDate(rawFdZbrnDate);
    const docDate = parseFlexibleDate(rawDoc);
    const dopDate = parseFlexibleDate(rawDop);
    const doiDate = parseFlexibleDate(rawDoi);
    const outBoundDelDate = parseFlexibleDate(rawOutBoundDelDate);
    const ageingDays = (doiDate && docDate) ? calculateAgeingDays(doiDate, docDate) : null;

    records.push({
      complaint_number: complaintNumber || null,
      zmac_date: zmacDate ? toMySQLDate(zmacDate) : null,
      zmac_status: zmacStatus || null,
      fd_zbrn_id: fdZbrnId || null,
      fd_zbrn_status: fdZbrnStatus || null,
      fd_zbrn_date: fdZbrnDate ? toMySQLDate(fdZbrnDate) : null,
      customer_first_name: customerFirstName || null,
      city: city || null,
      franchisee_id: franchiseeId || null,
      franchisee_name: franchiseeName || null,
      branch: branch || null,
      doc: docDate ? toMySQLDate(docDate) : null,
      ticket_no: ticketNo || null,
      call_type: callType || null,
      machine_status: normalizedMachineStatus || null,
      dop: dopDate ? toMySQLDate(dopDate) : null,
      doi: doiDate ? toMySQLDate(doiDate) : null,
      technician_name: technicianName || null,
      technician_no: technicianNo || null,
      mat_cat: normalizedMatCat || null,
      product_id: productId || null,
      model: model || null,
      serial_number: serialNumber || null,
      part_number: partNumber || null,
      part_name: partName || null,
      survey_origin: surveyOrigin || null,
      type_of_damage: typeOfDamage || null,
      customer_complaint: customerComplaint || null,
      part_description: partDescription || partName || null,
      part_code: partCode || partNumber || null,
      out_bound_del: outBoundDel || null,
      out_bound_del_date: outBoundDelDate ? toMySQLDate(outBoundDelDate) : null,
      dealer_code: dealerCode || null,
      dealer_name: dealerName || null,
      bse_name: bseName || null,
      industry: industry || null,
      ageing_days: (ageingDays !== null && ageingDays >= 0) ? ageingDays : null,
      raw_payload: JSON.stringify(data),
    });
  }

  return { records, skipped };
}

module.exports = { processRows };
