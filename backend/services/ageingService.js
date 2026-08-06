// ============================================================
// Ageing / Data Processing Service
// ------------------------------------------------------------
// Transforms a raw parsed Excel row into a clean record ready
// for MySQL insertion: normalizes dates, computes the Ageing
// column (DOC - DOI in days), applies business filters (mat cat
// & machine status / SPU Status / Rej Qty), and deduplicates by
// Serial Number / Complaint Number.
// ============================================================

const { parseFlexibleDate, toMySQLDate, calculateAgeingDays } = require('../utils/dateUtils');
const { getFieldValue } = require('../middlewares/validateUpload');

/**
 * Processes an array of { rowNumber, data } raw row objects into
 * clean records ready for insertion, plus a report of what was
 * skipped and why.
 *
 * @param {Array<{rowNumber:number, data:object}>} rawRows
 * @param {'PRODUCT_REPLACEMENT'|'PART_REPLACEMENT'} uploadType
 * @returns {{ records: object[], skipped: object[] }}
 */
function processRows(rawRows, uploadType = 'PRODUCT_REPLACEMENT') {
  const records = [];
  const skipped = [];
  const seenSerialNumbers = new Set();

  for (const { rowNumber, data } of rawRows) {
    const serialNumber = getFieldValue(data, ['serial number', 'Serial Number', 'Serial No', 'Serial_Number', 'SerialNo', 'SERIAL NUMBER']);
    const complaintNumber = getFieldValue(data, ['ZMAC ID', 'ZMAC_ID', 'ZMACID', 'Complaint Number', 'Complaint No', 'Complaint', 'SPU ID', 'SPU_ID', 'SPUID']);

    if (!serialNumber) {
      skipped.push({ rowNumber, reason: 'Missing Serial Number', complaintNumber: complaintNumber || null, serialNumber: null });
      continue;
    }

    if (seenSerialNumbers.has(serialNumber)) {
      skipped.push({ rowNumber, reason: 'Duplicate Serial Number within file', complaintNumber: complaintNumber || null, serialNumber });
      continue;
    }

    // Common fields
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

    const ticketNo = getFieldValue(data, ['Ticket', 'ticket', 'TICKET', 'Ticket No', 'ticket no', 'ticket_no', 'Ticket Number', 'SPU NO', 'SPU No', 'SPU_NO']);
    const callType = getFieldValue(data, ['call type', 'Call Type', 'call_type']);
    const machineStatus = getFieldValue(data, ['machine status', 'Machine Status', 'MACHINE STATUS', 'machine_status']);
    const normalizedMachineStatus = machineStatus ? machineStatus.trim() : null;

    const rawDop = getFieldValue(data, ['dop', 'DOP', 'Date of Purchase', 'DOP ']);
    const rawDoi = getFieldValue(data, ['doi', 'DOI', 'Date of Installation', 'Installation Date', 'DOI ']);
    
    const technicianName = getFieldValue(data, ['technician name', 'Technician Name', 'technician_no', 'Technician']);
    const technicianNo = getFieldValue(data, ['technician no', 'Technician No', 'technician_no', 'Technician Number']);

    const matCat = getFieldValue(data, ['mat cat', 'Mat Cat', 'MAT CAT', 'mat_cat', 'Material Category', 'Mat_Cat']);
    const productCat = getFieldValue(data, ['Product Category', 'product category', 'PRODUCT CATEGORY', 'product_category', 'Product Cat']) || matCat;
    const normalizedMatCat = productCat ? productCat.toUpperCase().trim() : null;

    const productId = getFieldValue(data, ['product id', 'Product ID', 'product_id']);
    const rawModel = getFieldValue(data, ['Model Name', 'model name', 'MODEL NAME', 'Model', 'model', 'product description', 'Product Description', 'PRODUCT DESCRIPTION']);
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

    // Product Replacement Specific Filters
    if (uploadType === 'PRODUCT_REPLACEMENT') {
      const cleanFdStatus = fdZbrnStatus ? fdZbrnStatus.trim().toLowerCase() : '';
      if (cleanFdStatus !== 'approved' && cleanFdStatus !== 'approved for upgrade') {
        skipped.push({ rowNumber, reason: `FD ZBRN Status '${fdZbrnStatus || 'N/A'}' is not Approved or Approved for Upgrade`, complaintNumber: complaintNumber || null, serialNumber });
        continue;
      }

      if (!normalizedMachineStatus || normalizedMachineStatus.toUpperCase() !== 'SW') {
        skipped.push({ rowNumber, reason: `Machine Status '${machineStatus || 'N/A'}' is not SW`, complaintNumber: complaintNumber || null, serialNumber });
        continue;
      }

      if (!normalizedMatCat || (normalizedMatCat !== 'WM' && normalizedMatCat !== 'WD')) {
        skipped.push({ rowNumber, reason: `Material Category '${productCat || matCat || 'N/A'}' is not WM or WD`, complaintNumber: complaintNumber || null, serialNumber });
        continue;
      }
    }

    // Part Replacement Specific Filters
    if (uploadType === 'PART_REPLACEMENT') {
      const spuStatus = getFieldValue(data, ['SPU Status', 'spu status', 'SPU_Status', 'spu_status', 'SPUStatus']);
      const cleanSpuStatus = spuStatus ? spuStatus.replace(/\s+/g, '').toLowerCase() : '';
      if (cleanSpuStatus !== 'closedbystoreexecutive') {
        skipped.push({ rowNumber, reason: `SPU Status '${spuStatus || 'N/A'}' is not ClosedByStoreExecutive`, complaintNumber: complaintNumber || null, serialNumber });
        continue;
      }

      if (!normalizedMachineStatus || normalizedMachineStatus.toLowerCase() !== 'warranty') {
        skipped.push({ rowNumber, reason: `Machine Status '${machineStatus || 'N/A'}' is not Warranty`, complaintNumber: complaintNumber || null, serialNumber });
        continue;
      }

      if (!normalizedMatCat || normalizedMatCat !== 'WM') {
        skipped.push({ rowNumber, reason: `Product Category '${productCat || 'N/A'}' is not WM`, complaintNumber: complaintNumber || null, serialNumber });
        continue;
      }

      const rejQtyRaw = getFieldValue(data, ['Rej Qty', 'rej qty', 'REJ QTY', 'Rej_Qty', 'RejQty', 'Rejected Qty', 'Reject Qty']);
      const rejQty = rejQtyRaw !== null ? Number(rejQtyRaw) : 0;
      if (isNaN(rejQty) || rejQty !== 0) {
        skipped.push({ rowNumber, reason: `Rej Qty '${rejQtyRaw}' is not 0`, complaintNumber: complaintNumber || null, serialNumber });
        continue;
      }
    }

    seenSerialNumbers.add(serialNumber);

    // Sub Category handling (TLU -> TL, FLU -> FL)
    const rawSubCat = getFieldValue(data, ['Sub Category', 'sub category', 'SUB CATEGORY', 'sub_category', 'SubCat']);
    let subCategory = null;
    if (rawSubCat) {
      const upperSub = rawSubCat.trim().toUpperCase();
      if (upperSub === 'TLU' || upperSub.startsWith('TL')) subCategory = 'TL';
      else if (upperSub === 'FLU' || upperSub.startsWith('FL')) subCategory = 'FL';
      else subCategory = upperSub;
    } else if (rawModel) {
      const upperModel = rawModel.trim().toUpperCase();
      if (upperModel.startsWith('TL')) subCategory = 'TL';
      else if (upperModel.startsWith('FL')) subCategory = 'FL';
    }

    // DOC handling: for Part Replacement, DOC = SPU Created Date
    const rawSpuCreatedDate = getFieldValue(data, ['SPU Created Date', 'spu created date', 'SPU_Created_Date', 'SPU Date']);
    const rawDoc = getFieldValue(data, ['ticket posting date', 'Ticket Posting Date', 'DOC', 'Date of Complaint', 'Complaint Date', 'Posting Date']);
    const targetDocDateRaw = uploadType === 'PART_REPLACEMENT' ? (rawSpuCreatedDate || rawDoc) : (rawDoc || rawSpuCreatedDate);

    const zmacDate = parseFlexibleDate(rawZmacDate);
    const fdZbrnDate = parseFlexibleDate(rawFdZbrnDate);
    const spuCreatedDate = parseFlexibleDate(rawSpuCreatedDate);
    const docDate = parseFlexibleDate(targetDocDateRaw);
    const dopDate = parseFlexibleDate(rawDop);
    const doiDate = parseFlexibleDate(rawDoi);
    const outBoundDelDate = parseFlexibleDate(rawOutBoundDelDate);

    // Ageing Days = SPU Created Date (DOC) - DOI in days
    const ageingDays = (doiDate && docDate) ? calculateAgeingDays(doiDate, docDate) : null;

    const spuStatusValue = getFieldValue(data, ['SPU Status', 'spu status', 'SPU_Status', 'spu_status', 'SPUStatus']);
    const rejQtyValue = getFieldValue(data, ['Rej Qty', 'rej qty', 'REJ QTY', 'Rej_Qty', 'RejQty']);

    const itemCode = getFieldValue(data, ['Item Code', 'item code', 'ITEM CODE', 'Item_Code', 'spare', 'Spare', 'Spare Code', 'Part Code', 'part code']);
    const description = getFieldValue(data, ['Description', 'description', 'DESCRIPTION', 'spare desc', 'Spare Desc', 'Part Description', 'part description']);
    const problemDescription = getFieldValue(data, ['Problem Description', 'problem description', 'PROBLEM DESCRIPTION', 'Problem_Description', 'customer complaint', 'Customer Complaint', 'Complaint Description']);

    records.push({
      complaint_number: complaintNumber || null,
      zmac_date: zmacDate ? toMySQLDate(zmacDate) : null,
      zmac_status: zmacStatus || null,
      spu_status: spuStatusValue || null,
      spu_created_date: spuCreatedDate ? toMySQLDate(spuCreatedDate) : null,
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
      product_category: normalizedMatCat || null,
      sub_category: subCategory || null,
      rej_qty: rejQtyValue !== null ? Number(rejQtyValue) : 0,
      dop: dopDate ? toMySQLDate(dopDate) : null,
      doi: doiDate ? toMySQLDate(doiDate) : null,
      technician_name: technicianName || null,
      technician_no: technicianNo || null,
      mat_cat: normalizedMatCat || null,
      product_id: productId || null,
      model: rawModel || null,
      serial_number: serialNumber || null,
      item_code: itemCode || partCode || partNumber || null,
      description: description || partDescription || partName || null,
      problem_description: problemDescription || customerComplaint || null,
      part_number: partNumber || null,
      part_name: partName || null,
      survey_origin: surveyOrigin || null,
      type_of_damage: typeOfDamage || null,
      customer_complaint: customerComplaint || problemDescription || null,
      part_description: partDescription || description || partName || null,
      part_code: partCode || itemCode || partNumber || null,
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
