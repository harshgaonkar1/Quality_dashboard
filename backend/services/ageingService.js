// ============================================================
// Ageing / Data Processing Service
// ------------------------------------------------------------
// Transforms raw parsed Excel rows into clean records ready
// for MySQL insertion: normalizes dates, computes Ageing
// (DOC - DOI in days), validates business constraints, and tracks
// exact cell coordinates (e.g., D14, A2) for all errors & date issues.
// ============================================================

const {
  validateDateCell,
  validateChronology,
  toMySQLDate,
  calculateAgeingDays,
} = require('../utils/dateUtils');
const { getFieldMeta, getFieldValue } = require('../middlewares/validateUpload');

/**
 * Processes an array of { rowNumber, sheetName, data, cellMap } raw row objects into
 * clean records ready for insertion, plus a comprehensive report of cell-level errors.
 *
 * @param {Array<{rowNumber:number, sheetName?:string, data:object, cellMap?:object}>} rawRows
 * @param {'PRODUCT_REPLACEMENT'|'PART_REPLACEMENT'|'PART_GROUPING'} uploadType
 * @returns {{ records: object[], skipped: object[], cellErrors: object[], errorBreakdown: object }}
 */
function processRows(rawRows, uploadType = 'PRODUCT_REPLACEMENT') {
  if (uploadType === 'PART_GROUPING') {
    return processGroupingRows(rawRows);
  }

  const records = [];
  const skipped = [];
  const cellErrors = [];
  const seenSerialNumbers = new Map(); // serial -> { rowNumber, cellAddress }
  let filteredCount = 0;

  const errorBreakdown = {
    dateErrors: 0,
    missingFields: 0,
    ruleViolations: 0,
    duplicates: 0,
    dataTypeErrors: 0,
    totalCellErrors: 0,
  };

  function recordCellError(errObj) {
    const errorEntry = {
      table: uploadType,
      sheetName: errObj.sheetName || 'Sheet1',
      cell: errObj.cell || `Row ${errObj.rowNumber}`,
      colLetter: errObj.colLetter || (errObj.cell ? errObj.cell.replace(/\d+/g, '') : null),
      colName: errObj.colName || 'Field',
      rowNumber: errObj.rowNumber,
      errorType: errObj.errorType || 'VALIDATION_ERROR',
      value: errObj.value !== undefined ? String(errObj.value) : '',
      expected: errObj.expected || '',
      message: errObj.message || 'Validation error',
      suggestedFix: errObj.suggestedFix || 'Review value in Excel',
      severity: errObj.severity || 'error',
    };

    cellErrors.push(errorEntry);
    errorBreakdown.totalCellErrors += 1;

    if (errObj.errorType?.includes('DATE') || errObj.errorType?.includes('CHRONOLOGY')) {
      errorBreakdown.dateErrors += 1;
    } else if (errObj.errorType?.includes('MISSING')) {
      errorBreakdown.missingFields += 1;
    } else if (errObj.errorType?.includes('DUPLICATE')) {
      errorBreakdown.duplicates += 1;
    } else if (errObj.errorType?.includes('TYPE')) {
      errorBreakdown.dataTypeErrors += 1;
    } else {
      errorBreakdown.ruleViolations += 1;
    }

    return errorEntry;
  }

  for (const rawRow of rawRows) {
    const rowNumber = rawRow.rowNumber;
    const sheetName = rawRow.sheetName || rawRow.data?._sheetName || 'Sheet1';
    const data = rawRow.data || rawRow;
    const rowCellErrors = [];

    // Extract all field metadata with cell addresses
    const serialMeta = getFieldMeta(data, ['serial number', 'Serial Number', 'Serial No', 'Serial_Number', 'SerialNo', 'SERIAL NUMBER', 'Serial', 'serial']);
    const serialNumber = serialMeta.value;
    const serialCell = serialMeta.cellAddress || (data._cellMap ? data._cellMap[serialMeta.matchedKey] : null) || `A${rowNumber}`;

    const complaintMeta = getFieldMeta(data, ['ZMAC ID', 'ZMAC_ID', 'ZMACID', 'Complaint Number', 'Complaint No', 'Complaint', 'SPU ID', 'SPU_ID', 'SPUID']);
    const complaintNumber = complaintMeta.value;

    const zmacDateMeta = getFieldMeta(data, ['zmac date', 'ZMAC Date', 'zmac_date']);
    const zmacStatusMeta = getFieldMeta(data, ['zmac status', 'ZMAC Status', 'zmac_status']);
    const fdZbrnIdMeta = getFieldMeta(data, ['fd zbrn id', 'FD ZBRN ID', 'fd_zbrn_id']);
    const fdZbrnStatusMeta = getFieldMeta(data, ['fd zbrn status', 'FD ZBRN STATUS', 'ZBRN Status', 'Status', 'status']);
    const fdZbrnDateMeta = getFieldMeta(data, ['fd zbrn date', 'FD ZBRN Date', 'fd_zbrn_date']);

    const custNameMeta = getFieldMeta(data, ['customer first name', 'Customer First Name', 'Customer Name', 'customer_first_name']);
    const cityMeta = getFieldMeta(data, ['city', 'City', 'CITY']);
    const franchiseeIdMeta = getFieldMeta(data, ['franchisee id', 'Franchisee ID', 'franchisee_id']);
    const franchiseeNameMeta = getFieldMeta(data, ['franchisee name', 'Franchisee Name', 'franchisee_name']);
    const franchiseMeta = getFieldMeta(data, ['Franchise', 'franchise', 'FRANCHISE', 'Franchisee Name', 'franchisee name']);
    const branchMeta = getFieldMeta(data, ['branch name', 'Branch Name', 'branch', 'Branch', 'BRANCH', 'ZBRN', 'Branch_Name']);

    const ticketMeta = getFieldMeta(data, ['Ticket', 'ticket', 'TICKET', 'Ticket No', 'ticket no', 'ticket_no', 'Ticket Number', 'SPU NO', 'SPU No', 'SPU_NO']);
    const callTypeMeta = getFieldMeta(data, ['call type', 'Call Type', 'call_type']);
    const machineStatusMeta = getFieldMeta(data, ['machine status', 'Machine Status', 'MACHINE STATUS', 'machine_status', 'Status', 'status']);
    const machineStatus = machineStatusMeta.value;
    const normalizedMachineStatus = machineStatus ? machineStatus.trim() : null;

    const dopMeta = getFieldMeta(data, ['dop', 'DOP', 'Date of Purchase', 'DOP ']);
    const doiMeta = getFieldMeta(data, ['doi', 'DOI', 'Date of Installation', 'Installation Date', 'DOI ']);
    const spuCreatedDateMeta = getFieldMeta(data, ['SPU Created Date', 'spu created date', 'SPU_Created_Date', 'spu_created_date', 'SPU Date', 'spu date', 'SPU Created Data', 'spu created data']);
    const docMeta = getFieldMeta(data, ['ticket posting date', 'Ticket Posting Date', 'DOC', 'doc', 'Date of Complaint', 'Complaint Date', 'Posting Date']);

    const technicianNameMeta = getFieldMeta(data, ['technician name', 'Technician Name', 'technician_no', 'Technician']);
    const technicianNoMeta = getFieldMeta(data, ['technician no', 'Technician No', 'technician_no', 'Technician Number']);

    const matCatMeta = getFieldMeta(data, ['mat cat', 'Mat Cat', 'MAT CAT', 'mat_cat', 'Material Category', 'Mat_Cat']);
    const productCatMeta = getFieldMeta(data, ['Product Category', 'product category', 'PRODUCT CATEGORY', 'product_category', 'Product Cat']);
    const rawCat = productCatMeta.value || matCatMeta.value;
    const normalizedMatCat = rawCat ? rawCat.toUpperCase().trim() : null;

    const productIdMeta = getFieldMeta(data, ['product id', 'Product ID', 'product_id']);
    const modelMeta = getFieldMeta(data, ['Model Name', 'model name', 'MODEL NAME', 'Model', 'model', 'product description', 'Product Description', 'PRODUCT DESCRIPTION']);
    const surveyOriginMeta = getFieldMeta(data, ['survey origin', 'Survey Origin', 'SURVEY ORIGIN', 'Survey_Origin', 'SurveyOrigin']);
    const typeOfDamageMeta = getFieldMeta(data, ['type of damage', 'TYPE OF DAMAGE', 'Damage Type']);
    const customerComplaintMeta = getFieldMeta(data, ['customer complaint', 'Customer Complaint', 'CUSTOMER COMPLAINT', 'Customer_Complaint', 'CustomerComplaint', 'Complaint Description']);

    const partDescMeta = getFieldMeta(data, ['spare desc', 'Spare Desc', 'SPARE DESC', 'Spare Description', 'spare description', 'SPARE DESCRIPTION', 'Spare_Desc', 'SpareDesc', 'Part Description', 'part description']);
    const partCodeMeta = getFieldMeta(data, ['spare', 'Spare', 'SPARE', 'Spare Code', 'spare code', 'SPARE CODE', 'Spare_Code', 'SpareCode', 'Part Code', 'part code']);
    const partNumberMeta = getFieldMeta(data, ['Part Number', 'part number', 'Part No']);
    const partNameMeta = getFieldMeta(data, ['Part Name', 'part name']);

    const outBoundDelMeta = getFieldMeta(data, ['out bound del', 'Out Bound Del', 'out_bound_del']);
    const outBoundDelDateMeta = getFieldMeta(data, ['out bound del date', 'Out Bound Del Date', 'out_bound_del_date']);
    const dealerCodeMeta = getFieldMeta(data, ['dealer code', 'Dealer Code', 'dealer_code']);
    const dealerNameMeta = getFieldMeta(data, ['dealer name', 'Dealer Name', 'dealer_name']);
    const bseNameMeta = getFieldMeta(data, ['BSE Name', 'bse name', 'BSE_Name', 'bse_name']);
    const industryMeta = getFieldMeta(data, ['Industry', 'industry', 'INDUSTRY']);

    const spuStatusMeta = getFieldMeta(data, ['SPU Status', 'spu status', 'SPU_Status', 'spu_status', 'SPUStatus', 'SPU Statue', 'spu statue', 'Status', 'status']);
    const approvedQtyMeta = getFieldMeta(data, ['Approved qty', 'Approved Qty', 'APPROVED QTY', 'App Qty', 'app qty', 'App_Qty', 'Approved_Qty', 'approved_qty', 'Approved Quantity', 'approved quantity']);
    const rejQtyMeta = getFieldMeta(data, ['Rej Qty', 'rej qty', 'REJ QTY', 'Rej_Qty', 'rej_qty', 'RejQty', 'Rejected Qty', 'Reject Qty', 'rejected qty']);
    const rawSubCatMeta = getFieldMeta(data, ['Sub Category', 'sub category', 'SUB CATEGORY', 'sub_category', 'SubCat', 'Sub_Cat']);
    const partGroupingMeta = getFieldMeta(data, ['Part Grouping', 'part grouping', 'PART GROUPING', 'Part_Grouping', 'part_grouping', 'Part Group', 'part group', 'Grouping', 'grouping', 'Spare Group', 'spare group']);

    // ============================================================
    // STEP 1: BUSINESS FILTERS (SILENT FILTER OUT - NO CELL ERRORS)
    // Filter out rows that do not match the business criteria.
    // ============================================================
    if (uploadType === 'PART_REPLACEMENT') {
      // 1. SPU Status: ClosedByStoreExecutive
      const spuStatus = spuStatusMeta.value;
      const cleanSpuStatus = spuStatus ? spuStatus.replace(/[\s_-]+/g, '').toLowerCase() : '';
      if (cleanSpuStatus !== 'closedbystoreexecutive') {
        filteredCount++;
        continue;
      }

      // 2. Machine Status: Warranty / In Warranty / IW
      const cleanMachineStatus = normalizedMachineStatus ? normalizedMachineStatus.replace(/[\s_-]+/g, '').toLowerCase() : '';
      const isWarranty = cleanMachineStatus.includes('warranty') || cleanMachineStatus === 'iw' || cleanMachineStatus === 'sw';
      if (!isWarranty) {
        filteredCount++;
        continue;
      }

      // 3. Sub Category: FL, FLU, TL, TLM, TLU, MW, MWO, MICROWAVE, MWU (or model starts with TL, FL, MW)
      const rawSubCat = rawSubCatMeta.value;
      let mappedSubCategory = null;
      if (rawSubCat) {
        const upperSub = rawSubCat.trim().toUpperCase().replace(/[\s_-]+/g, '');
        if (upperSub === 'FLU' || upperSub === 'FL') mappedSubCategory = 'FL';
        else if (upperSub === 'TL' || upperSub === 'TLU' || upperSub === 'TLM' || upperSub === 'TL-M') mappedSubCategory = 'TL';
        else if (upperSub === 'MW' || upperSub === 'MWO' || upperSub === 'MICROWAVE' || upperSub === 'MWU') mappedSubCategory = 'MW';
      }
      if (!mappedSubCategory && modelMeta.value) {
        const upperModel = modelMeta.value.trim().toUpperCase();
        if (upperModel.startsWith('TL')) mappedSubCategory = 'TL';
        else if (upperModel.startsWith('FL')) mappedSubCategory = 'FL';
        else if (upperModel.startsWith('MW')) mappedSubCategory = 'MW';
      }
      if (!mappedSubCategory) {
        filteredCount++;
        continue;
      }

      // 4. Approved Qty >= 1
      const approvedQtyRaw = approvedQtyMeta.value;
      const approvedQty = (approvedQtyRaw !== null && approvedQtyRaw !== undefined && String(approvedQtyRaw).trim() !== '') ? Number(approvedQtyRaw) : null;
      if (approvedQty === null || isNaN(approvedQty) || approvedQty < 1) {
        filteredCount++;
        continue;
      }

      // 5. Rej Qty == 0
      const rejQtyRaw = rejQtyMeta.value;
      const rejQty = (rejQtyRaw !== null && rejQtyRaw !== undefined && String(rejQtyRaw).trim() !== '') ? Number(rejQtyRaw) : 0;
      if (isNaN(rejQty) || rejQty !== 0) {
        filteredCount++;
        continue;
      }
    } else if (uploadType === 'PRODUCT_REPLACEMENT') {
      // 1. FD ZBRN Status: Approved / Approved for Upgrade
      const fdZbrnStatus = fdZbrnStatusMeta.value;
      const cleanFdStatus = fdZbrnStatus ? fdZbrnStatus.trim().toLowerCase() : '';
      if (cleanFdStatus !== 'approved' && cleanFdStatus !== 'approved for upgrade' && cleanFdStatus !== 'approvedforupgrade') {
        filteredCount++;
        continue;
      }

      // 2. Machine Status: SW / Warranty / In Warranty
      const cleanMachineStatus = normalizedMachineStatus ? normalizedMachineStatus.trim().toUpperCase() : '';
      if (cleanMachineStatus !== 'SW' && !cleanMachineStatus.includes('WARRANTY') && cleanMachineStatus !== 'IW') {
        filteredCount++;
        continue;
      }

      // 3. Category: WM, WD, MW, MWO
      if (!normalizedMatCat || (normalizedMatCat !== 'WM' && normalizedMatCat !== 'WD' && normalizedMatCat !== 'MW' && normalizedMatCat !== 'MWO')) {
        filteredCount++;
        continue;
      }
    }

    // ============================================================
    // STEP 2: DATA INTEGRITY & ISSUE TRACKING
    // Flag exact cell errors for null/invalid DOC, DOI, Serial #, duplicates
    // ============================================================
    let isRowSkipped = false;
    let skipReason = '';

    // 1. Serial Number: Missing or Duplicate
    if (!serialNumber) {
      const err = recordCellError({
        sheetName,
        rowNumber,
        cell: serialCell,
        colLetter: serialMeta.colLetter || 'A',
        colName: 'Serial Number',
        errorType: 'MISSING_REQUIRED_FIELD',
        value: '(empty)',
        expected: 'Non-empty Serial Number',
        message: `Missing Serial Number at cell ${serialCell}. Machine serial number is required.`,
        suggestedFix: `Enter the machine Serial Number in cell ${serialCell}.`,
      });
      rowCellErrors.push(err);
      isRowSkipped = true;
      skipReason = 'Missing Serial Number';
    } else {
      const isPartUpload = uploadType === 'PART_REPLACEMENT';
      const itemCode = partCodeMeta.value || partNumberMeta.value || '';
      const normalizedSerial = serialNumber.trim().toUpperCase();
      const duplicateKey = isPartUpload && itemCode
        ? `${normalizedSerial}__${String(itemCode).trim().toUpperCase()}`
        : normalizedSerial;

      if (seenSerialNumbers.has(duplicateKey)) {
        const firstSeen = seenSerialNumbers.get(duplicateKey);
        const err = recordCellError({
          sheetName,
          rowNumber,
          cell: serialCell,
          colLetter: serialMeta.colLetter || 'A',
          colName: 'Serial Number',
          errorType: 'DUPLICATE_KEY',
          value: serialNumber,
          expected: 'Unique entry per file',
          message: isPartUpload && itemCode
            ? `Duplicate entry: Serial Number '${serialNumber}' with Item '${itemCode}' in cell ${serialCell} already appeared at row ${firstSeen.rowNumber} (cell ${firstSeen.cellAddress}).`
            : `Duplicate Serial Number '${serialNumber}' in cell ${serialCell} (already appeared at row ${firstSeen.rowNumber} cell ${firstSeen.cellAddress}).`,
          suggestedFix: `Ensure each serial number / part entry appears only once per file.`,
        });
        rowCellErrors.push(err);
        isRowSkipped = true;
        skipReason = `Duplicate Entry for Serial '${serialNumber}' (first seen at row ${firstSeen.rowNumber})`;
      } else {
        seenSerialNumbers.set(duplicateKey, { rowNumber, cellAddress: serialCell });
      }
    }

    // 2. DOC (Date of Complaint / SPU Created Date / Ticket Posting Date)
    const isPartUpload = uploadType === 'PART_REPLACEMENT';
    const docValue = isPartUpload ? (spuCreatedDateMeta.value || docMeta.value) : (docMeta.value || spuCreatedDateMeta.value);
    const docAddress = isPartUpload ? (spuCreatedDateMeta.cellAddress || docMeta.cellAddress) : (docMeta.cellAddress || spuCreatedDateMeta.cellAddress);
    const docLetter = isPartUpload ? (spuCreatedDateMeta.colLetter || docMeta.colLetter) : (docMeta.colLetter || spuCreatedDateMeta.colLetter);

    const docDateVal = validateDateCell(docValue, {
      fieldName: isPartUpload ? 'SPU Created Date / DOC' : 'DOC / Date of Complaint',
      cellAddress: docAddress,
      rowNumber,
      colLetter: docLetter,
      required: true,
    });
    if (!docDateVal.valid) {
      const err = recordCellError({ sheetName, ...docDateVal.error });
      rowCellErrors.push(err);
      isRowSkipped = true;
      if (!skipReason) skipReason = docDateVal.error.message;
    }

    // 3. DOI (Date of Installation)
    const doiVal = validateDateCell(doiMeta.value, {
      fieldName: 'DOI (Installation Date)',
      cellAddress: doiMeta.cellAddress,
      rowNumber,
      colLetter: doiMeta.colLetter,
      required: true,
    });
    if (!doiVal.valid) {
      const err = recordCellError({ sheetName, ...doiVal.error });
      rowCellErrors.push(err);
      isRowSkipped = true;
      if (!skipReason) skipReason = doiVal.error.message;
    }

    // 4. Chronology check between DOI and DOC
    if (doiVal.parsedDate && docDateVal.parsedDate) {
      const chronology = validateChronology(doiVal.parsedDate, docDateVal.parsedDate, {
        doiCell: doiMeta.cellAddress,
        docCell: docAddress,
        rowNumber,
      });
      if (!chronology.valid) {
        const err = recordCellError({ sheetName, ...chronology.error, severity: 'warning' });
        rowCellErrors.push(err);
      }
    }

    // 5. Optional other date checks (DOP, ZMAC, FD, Outbound) if values exist
    const dopVal = validateDateCell(dopMeta.value, {
      fieldName: 'DOP (Purchase Date)',
      cellAddress: dopMeta.cellAddress,
      rowNumber,
      colLetter: dopMeta.colLetter,
      required: false,
    });
    if (!dopVal.valid) {
      const err = recordCellError({ sheetName, ...dopVal.error });
      rowCellErrors.push(err);
    }

    const zmacDateVal = validateDateCell(zmacDateMeta.value, {
      fieldName: 'ZMAC Date',
      cellAddress: zmacDateMeta.cellAddress,
      rowNumber,
      colLetter: zmacDateMeta.colLetter,
      required: false,
    });
    if (!zmacDateVal.valid) {
      const err = recordCellError({ sheetName, ...zmacDateVal.error });
      rowCellErrors.push(err);
    }

    const fdDateVal = validateDateCell(fdZbrnDateMeta.value, {
      fieldName: 'FD ZBRN Date',
      cellAddress: fdZbrnDateMeta.cellAddress,
      rowNumber,
      colLetter: fdZbrnDateMeta.colLetter,
      required: false,
    });
    if (!fdDateVal.valid) {
      const err = recordCellError({ sheetName, ...fdDateVal.error });
      rowCellErrors.push(err);
    }

    const outBoundDateVal = validateDateCell(outBoundDelDateMeta.value, {
      fieldName: 'Out Bound Del Date',
      cellAddress: outBoundDelDateMeta.cellAddress,
      rowNumber,
      colLetter: outBoundDelDateMeta.colLetter,
      required: false,
    });
    if (!outBoundDateVal.valid) {
      const err = recordCellError({ sheetName, ...outBoundDateVal.error });
      rowCellErrors.push(err);
    }

    if (isRowSkipped) {
      skipped.push({
        rowNumber,
        sheetName,
        reason: skipReason,
        complaintNumber: complaintNumber || ticketMeta.value || null,
        serialNumber: serialNumber || null,
        cellErrors: rowCellErrors,
      });
      continue;
    }

    // Sub Category resolution
    let subCategory = null;
    if (rawSubCatMeta.value) {
      const upperSub = rawSubCatMeta.value.trim().toUpperCase().replace(/[\s_-]+/g, '');
      if (upperSub === 'FLU' || upperSub === 'FL') subCategory = 'FL';
      else if (upperSub === 'TL' || upperSub === 'TLU' || upperSub === 'TLM' || upperSub === 'TL-M') subCategory = 'TL';
      else if (upperSub === 'MW' || upperSub === 'MWO' || upperSub === 'MICROWAVE' || upperSub === 'MWU') subCategory = 'MW';
      else subCategory = upperSub;
    } else if (modelMeta.value) {
      const upperModel = modelMeta.value.trim().toUpperCase();
      if (upperModel.startsWith('TL')) subCategory = 'TL';
      else if (upperModel.startsWith('FL')) subCategory = 'FL';
      else if (upperModel.startsWith('MW')) subCategory = 'MW';
    }

    // Ageing Days calculation
    const resolvedDocDate = docDateVal.parsedDate;
    const ageingDays = (doiVal.parsedDate && resolvedDocDate) ? calculateAgeingDays(doiVal.parsedDate, resolvedDocDate) : null;

    const itemCode = partCodeMeta.value || partNumberMeta.value;
    const description = partDescMeta.value || partNameMeta.value;
    const problemDescription = customerComplaintMeta.value;

    const resolvedComplaintDate = docDateVal.parsedDate ? toMySQLDate(docDateVal.parsedDate) : (zmacDateVal.parsedDate ? toMySQLDate(zmacDateVal.parsedDate) : null);
    const resolvedZmacDate = zmacDateVal.parsedDate ? toMySQLDate(zmacDateVal.parsedDate) : resolvedComplaintDate;

    records.push({
      complaint_number: complaintNumber || ticketMeta.value || null,
      zmac_date: resolvedZmacDate,
      zmac_status: zmacStatusMeta.value || null,
      spu_status: spuStatusMeta.value || null,
      spu_created_date: resolvedComplaintDate,
      fd_zbrn_id: fdZbrnIdMeta.value || null,
      fd_zbrn_status: fdZbrnStatusMeta.value || null,
      fd_zbrn_date: fdDateVal.parsedDate ? toMySQLDate(fdDateVal.parsedDate) : null,
      customer_first_name: custNameMeta.value || null,
      city: cityMeta.value || null,
      franchisee_id: franchiseeIdMeta.value || null,
      franchisee_name: franchiseeNameMeta.value || franchiseMeta.value || null,
      franchise: franchiseMeta.value || franchiseeNameMeta.value || null,
      branch: branchMeta.value || null,
      doc: resolvedComplaintDate,
      ticket_no: ticketMeta.value || complaintNumber || null,
      call_type: callTypeMeta.value || null,
      machine_status: normalizedMachineStatus || null,
      product_category: normalizedMatCat || null,
      sub_category: subCategory || null,
      approved_qty: approvedQtyMeta.value !== null && approvedQtyMeta.value !== undefined && String(approvedQtyMeta.value).trim() !== '' ? Number(approvedQtyMeta.value) : 0,
      rej_qty: rejQtyMeta.value !== null && rejQtyMeta.value !== undefined && String(rejQtyMeta.value).trim() !== '' ? Number(rejQtyMeta.value) : 0,
      dop: dopVal.parsedDate ? toMySQLDate(dopVal.parsedDate) : null,
      doi: doiVal.parsedDate ? toMySQLDate(doiVal.parsedDate) : null,
      technician_name: technicianNameMeta.value || null,
      technician_no: technicianNoMeta.value || null,
      mat_cat: normalizedMatCat || null,
      product_id: productIdMeta.value || null,
      model: modelMeta.value || null,
      serial_number: serialNumber || null,
      item_code: itemCode || null,
      description: description || null,
      part_grouping: partGroupingMeta.value ? partGroupingMeta.value.trim() : null,
      grouping: partGroupingMeta.value ? partGroupingMeta.value.trim() : null,
      problem_description: problemDescription || null,
      part_number: partNumberMeta.value || null,
      part_name: partNameMeta.value || null,
      survey_origin: surveyOriginMeta.value || null,
      type_of_damage: typeOfDamageMeta.value || null,
      customer_complaint: customerComplaintMeta.value || null,
      part_description: partDescMeta.value || null,
      part_code: partCodeMeta.value || itemCode || null,
      out_bound_del: outBoundDelMeta.value || null,
      out_bound_del_date: outBoundDateVal.parsedDate ? toMySQLDate(outBoundDateVal.parsedDate) : null,
      dealer_code: dealerCodeMeta.value || null,
      dealer_name: dealerNameMeta.value || null,
      bse_name: bseNameMeta.value || null,
      industry: industryMeta.value || null,
      ageing_days: (ageingDays !== null && ageingDays >= 0) ? ageingDays : null,
      raw_payload: JSON.stringify(data),
    });
  }

  return { records, skipped, filteredCount, cellErrors, errorBreakdown };
}

/**
 * Processes raw rows from a Part Grouping Master/Lookup Excel or CSV file.
 */
function processGroupingRows(rawRows) {
  const records = [];
  const skipped = [];
  const cellErrors = [];
  const seenCodes = new Map();

  const errorBreakdown = {
    dateErrors: 0,
    missingFields: 0,
    ruleViolations: 0,
    duplicates: 0,
    dataTypeErrors: 0,
    totalCellErrors: 0,
  };

  function recordCellError(errObj) {
    const errorEntry = {
      table: 'PART_GROUPING',
      sheetName: errObj.sheetName || 'Sheet1',
      cell: errObj.cell || `Row ${errObj.rowNumber}`,
      colLetter: errObj.colLetter || (errObj.cell ? errObj.cell.replace(/\d+/g, '') : null),
      colName: errObj.colName || 'Field',
      rowNumber: errObj.rowNumber,
      errorType: errObj.errorType || 'VALIDATION_ERROR',
      value: errObj.value !== undefined ? String(errObj.value) : '',
      expected: errObj.expected || '',
      message: errObj.message || 'Validation error',
      suggestedFix: errObj.suggestedFix || 'Review value in Excel',
      severity: errObj.severity || 'error',
    };

    cellErrors.push(errorEntry);
    errorBreakdown.totalCellErrors += 1;

    if (errObj.errorType?.includes('MISSING')) {
      errorBreakdown.missingFields += 1;
    } else if (errObj.errorType?.includes('DUPLICATE')) {
      errorBreakdown.duplicates += 1;
    } else {
      errorBreakdown.ruleViolations += 1;
    }

    return errorEntry;
  }

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const data = rawRow.data || rawRow;
    const rowNumber = rawRow.rowNumber || (i + 2);
    const sheetName = rawRow.sheetName || data._sheetName || 'Sheet1';
    const rowCellErrors = [];

    const itemCodeMeta = getFieldMeta(data, [
      'ItemCode', 'Item Code', 'item code', 'ITEM CODE', 'Item_Code', 'item_code',
      'Part Code', 'part code', 'PartCode', 'part_code', 'PART CODE', 'Part_Code',
      'Spare Code', 'spare code', 'SpareCode', 'spare_code', 'Spare', 'spare',
      'Material Code', 'material code', 'Material', 'material', 'Mat Code', 'mat code',
      'Part No', 'part no', 'Part_No', 'Part Number', 'part number', 'Code', 'code',
    ]);
    const partCodeMeta = getFieldMeta(data, [
      'Part Code', 'part code', 'PartCode', 'part_code', 'PART CODE', 'Part_Code',
      'ItemCode', 'Item Code', 'item code', 'ITEM CODE', 'Item_Code', 'item_code',
      'Spare Code', 'spare code', 'SpareCode', 'spare_code', 'Spare', 'spare',
      'Part No', 'part no', 'Part_No', 'Part Number', 'part number',
    ]);
    const groupingMeta = getFieldMeta(data, [
      'Part Grouping', 'part grouping', 'PART GROUPING', 'Part_Grouping', 'part_grouping',
      'Part Group', 'part group', 'PART GROUP', 'Part_Group', 'part_group',
      'Grouping', 'grouping', 'GROUPING', 'Group', 'group', 'GROUP',
      'Grouping Name', 'grouping name', 'GROUPING NAME', 'grouping_name', 'groupingname',
      'Group Name', 'group_name', 'GROUP NAME', 'Spare Group', 'spare group', 'QA Grouping', 'qa grouping',
    ]);
    const descMeta = getFieldMeta(data, [
      'Description', 'description', 'DESCRIPTION', 'Part Description', 'part description', 'PART DESCRIPTION',
      'Part Name', 'part name', 'PART NAME', 'Spare Desc', 'spare desc', 'SPARE DESC',
      'Material Description', 'material description', 'MATERIAL DESCRIPTION', 'Name', 'name',
    ]);
    const catMeta = getFieldMeta(data, [
      'Category', 'category', 'CATEGORY', 'Product Category', 'product category', 'Sub Category', 'sub category', 'mat cat', 'Mat Cat',
    ]);

    const resolvedCode = itemCodeMeta.value || partCodeMeta.value;
    const codeCell = itemCodeMeta.cellAddress || partCodeMeta.cellAddress || `A${rowNumber}`;

    if (!resolvedCode) {
      const err = recordCellError({
        sheetName,
        rowNumber,
        cell: codeCell,
        colLetter: itemCodeMeta.colLetter || 'A',
        colName: 'Item Code / Part Code',
        errorType: 'MISSING_REQUIRED_FIELD',
        value: '(empty)',
        expected: 'Non-empty Item Code or Part Code',
        message: `Missing Item Code in cell ${codeCell}.`,
        suggestedFix: `Enter the item or part code in cell ${codeCell}.`,
      });
      rowCellErrors.push(err);
      skipped.push({ rowNumber, sheetName, reason: 'Missing item_code or part_code', cellErrors: rowCellErrors });
      continue;
    }

    if (!groupingMeta.value) {
      const groupCell = groupingMeta.cellAddress || `C${rowNumber}`;
      const err = recordCellError({
        sheetName,
        rowNumber,
        cell: groupCell,
        colLetter: groupingMeta.colLetter || 'C',
        colName: 'Part Grouping',
        errorType: 'MISSING_REQUIRED_FIELD',
        value: '(empty)',
        expected: 'Non-empty Part Grouping name',
        message: `Missing Part Grouping name in cell ${groupCell}.`,
        suggestedFix: `Enter the grouping name (e.g. 'Drum Assembly', 'Motor') in cell ${groupCell}.`,
      });
      rowCellErrors.push(err);
      skipped.push({ rowNumber, sheetName, reason: 'Missing part_grouping name', cellErrors: rowCellErrors });
      continue;
    }

    const normKey = resolvedCode.trim().toUpperCase();
    if (seenCodes.has(normKey)) {
      const firstSeen = seenCodes.get(normKey);
      const err = recordCellError({
        sheetName,
        rowNumber,
        cell: codeCell,
        colLetter: itemCodeMeta.colLetter || 'A',
        colName: 'Item Code',
        errorType: 'DUPLICATE_KEY',
        value: resolvedCode,
        expected: 'Unique Item Code per lookup file',
        message: `Duplicate code '${resolvedCode}' in cell ${codeCell} (already defined at row ${firstSeen.rowNumber} cell ${firstSeen.cellAddress}).`,
        suggestedFix: `Remove duplicate code entry in cell ${codeCell}.`,
      });
      rowCellErrors.push(err);
      skipped.push({ rowNumber, sheetName, reason: `Duplicate code ${resolvedCode} in file`, cellErrors: rowCellErrors });
      continue;
    }
    seenCodes.set(normKey, { rowNumber, cellAddress: codeCell });

    records.push({
      item_code: resolvedCode.trim(),
      part_code: (partCodeMeta.value || resolvedCode).trim(),
      part_name: descMeta.value ? descMeta.value.trim() : null,
      part_description: descMeta.value ? descMeta.value.trim() : null,
      part_grouping: groupingMeta.value.trim(),
      category: catMeta.value ? catMeta.value.trim() : null,
    });
  }

  return { records, skipped, cellErrors, errorBreakdown };
}

module.exports = { processRows, processGroupingRows };


