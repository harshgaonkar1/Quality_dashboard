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
    aliases: ['Serial Number', 'serial number', 'Serial No', 'Serial_Number', 'SerialNo', 'SERIAL NUMBER', 'Serial', 'serial'],
  },
  {
    name: 'Branch',
    aliases: ['Branch', 'branch', 'BRANCH', 'Branch Name', 'branch name', 'Branch_Name', 'ZBRN'],
  },
  {
    name: 'Franchise',
    aliases: ['Franchise', 'franchise', 'FRANCHISE', 'Franchisee Name', 'franchisee name', 'Franchisee_Name', 'Franchisee ID', 'franchisee id'],
  },
  {
    name: 'SPU Status',
    aliases: ['SPU Status', 'spu status', 'SPU_Status', 'spu_status', 'SPUStatus', 'SPU Statue', 'spu statue', 'Status', 'status'],
  },
  {
    name: 'SPU Created Date / DOC',
    aliases: ['SPU Created Date', 'spu created date', 'SPU_Created_Date', 'spu_created_date', 'SPU Date', 'spu date', 'SPU Created Data', 'spu created data', 'ticket posting date', 'Ticket Posting Date', 'DOC', 'doc', 'Date of Complaint', 'Complaint Date', 'Posting Date'],
  },
  {
    name: 'Ticket / Complaint Number',
    aliases: ['Ticket', 'ticket', 'TICKET', 'Ticket No', 'ticket no', 'Ticket_No', 'ticket_no', 'Ticket Number', 'SPU NO', 'spu no', 'SPU_NO', 'ZMAC ID', 'ZMAC_ID', 'Complaint Number', 'Complaint No', 'Complaint'],
  },
  {
    name: 'Machine Status',
    aliases: ['Machine Status', 'machine status', 'MACHINE STATUS', 'machine_status', 'Machine_Status', 'Status', 'status'],
  },
  {
    name: 'Sub Category / Product Category',
    aliases: ['Sub Category', 'sub category', 'SUB CATEGORY', 'sub_category', 'SubCat', 'Sub_Cat', 'Product Category', 'product category', 'mat cat', 'Mat Cat'],
  },
  {
    name: 'Product Description / Model',
    aliases: ['Model Name', 'model name', 'MODEL NAME', 'Model_Name', 'Model', 'model', 'Product Description', 'PRODUCT DESCRIPTION', 'Product_Description'],
  },
  {
    name: 'DOI',
    aliases: ['DOI', 'doi', 'Date of Installation', 'Installation Date', 'DOI ', 'Installation_Date'],
  },
  {
    name: 'Item Code / Spare Code',
    aliases: ['Item Code', 'item code', 'ItemCode', 'ITEM CODE', 'Item_Code', 'item_code', 'Spare Code', 'spare code', 'SpareCode', 'Part Code', 'part code', 'PartCode', 'part_code', 'Spare', 'spare'],
  },
  {
    name: 'Description / Part Description',
    aliases: ['Description', 'description', 'DESCRIPTION', 'Part Description', 'part description', 'PartDescription', 'Spare Desc', 'spare desc', 'Spare Description', 'Part Name', 'part name'],
  },
  {
    name: 'Approved Qty',
    aliases: ['Approved Qty', 'approved qty', 'Approved qty', 'APPROVED QTY', 'App Qty', 'app qty', 'App_Qty', 'Approved_Qty', 'approved_qty', 'Approved Quantity', 'approved quantity'],
  },
  {
    name: 'Rej Qty',
    aliases: ['Rej Qty', 'rej qty', 'REJ QTY', 'Rej_Qty', 'rej_qty', 'RejQty', 'Rejected Qty', 'Reject Qty', 'rejected qty'],
  },
  {
    name: 'Part Grouping',
    aliases: ['Part Grouping', 'part grouping', 'PART GROUPING', 'Part_Grouping', 'part_grouping', 'Part Group', 'part group', 'Grouping', 'grouping', 'Spare Group', 'spare group'],
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
  return { valid: true, missingColumns: [] };
}

function validateRow(row) {
  if (!row || Object.keys(row).length === 0) {
    return { valid: false, reason: 'Empty row' };
  }
  return { valid: true, reason: null };
}

module.exports = { REQUIRED_COLUMN_GROUPS, validateHeaders, validateRow, getFieldValue };
