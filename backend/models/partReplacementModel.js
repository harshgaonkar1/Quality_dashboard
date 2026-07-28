// ============================================================
// Part Replacement Model (Repository Pattern)
// ------------------------------------------------------------
// All raw SQL for the part_replacement table lives here.
// Services call these functions rather than writing SQL inline,
// keeping query logic centralized and testable.
// ============================================================

const { pool } = require('../database/connection');

/**
 * Builds standard WHERE clause incorporating optional damage type, sub category, ageing range, single date, and search.
 */
function buildWhereClause({ search = '', ageingMin = null, ageingMax = null, productCategory = '', subCategory = '', date = '' } = {}) {
  let whereClause = '1=1';
  const params = [];

  const subCatFilter = subCategory || productCategory; // support both param names
  if (subCatFilter && subCatFilter.trim() !== '' && subCatFilter.toUpperCase() !== 'ALL') {
    const cat = subCatFilter.trim().toUpperCase();
    if (cat === 'TL') {
      whereClause += " AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%')";
    } else if (cat === 'FL') {
      whereClause += " AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL')))";
    }
  }

  if (date) {
    whereClause += ' AND (DATE(spu_created_date) = ? OR (spu_created_date IS NULL AND DATE(doc) = ?))';
    params.push(date, date);
  }

  if (ageingMin !== null && ageingMax !== null) {
    if (ageingMin === 0 && ageingMax === 90) {
      whereClause += ' AND (ageing_days BETWEEN ? AND ? OR ageing_days IS NULL OR ageing_days < 0)';
    } else {
      whereClause += ' AND ageing_days BETWEEN ? AND ?';
    }
    params.push(ageingMin, ageingMax);
  }

  if (search) {
    whereClause += ' AND (branch LIKE ? OR spu_status LIKE ? OR ticket_no LIKE ? OR machine_status LIKE ? OR model LIKE ? OR serial_number LIKE ? OR item_code LIKE ? OR description LIKE ? OR problem_description LIKE ? OR complaint_number LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like, like, like, like);
  }

  return { whereClause, params };
}

/**
 * Returns ageing-bucket counts and TL/FL bifurcation for Part Replacement summary cards.
 */
async function getSummaryCounts({ typeOfDamage = '', productCategory = '', subCategory = '', date = '' } = {}) {
  const { whereClause, params } = buildWhereClause({ typeOfDamage, productCategory, subCategory, date });
  const [rows] = await pool.query(
    `SELECT
        SUM(CASE WHEN ageing_days IS NULL OR ageing_days <= 90 THEN 1 ELSE 0 END) AS bucket_0_3_months,
        SUM(CASE WHEN (ageing_days IS NULL OR ageing_days <= 90) AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_0_3_months_tl,
        SUM(CASE WHEN (ageing_days IS NULL OR ageing_days <= 90) AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL'))) THEN 1 ELSE 0 END) AS bucket_0_3_months_fl,

        SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 THEN 1 ELSE 0 END)   AS bucket_1_year,
        SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_1_year_tl,
        SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL'))) THEN 1 ELSE 0 END) AS bucket_1_year_fl,

        SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 THEN 1 ELSE 0 END)  AS bucket_2_year,
        SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_2_year_tl,
        SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL'))) THEN 1 ELSE 0 END) AS bucket_2_year_fl,

        SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 THEN 1 ELSE 0 END) AS bucket_3_year,
        SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_3_year_tl,
        SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL'))) THEN 1 ELSE 0 END) AS bucket_3_year_fl,

        SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 THEN 1 ELSE 0 END) AS bucket_4_year,
        SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_4_year_tl,
        SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL'))) THEN 1 ELSE 0 END) AS bucket_4_year_fl,

        SUM(CASE WHEN ageing_days > 1460 THEN 1 ELSE 0 END)               AS bucket_more_than_4_years,
        SUM(CASE WHEN ageing_days > 1460 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_more_than_4_years_tl,
        SUM(CASE WHEN ageing_days > 1460 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL'))) THEN 1 ELSE 0 END) AS bucket_more_than_4_years_fl,

        SUM(CASE WHEN UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END) AS tl_count,
        SUM(CASE WHEN UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL')) THEN 1 ELSE 0 END) AS fl_count,
        COUNT(*) AS total
     FROM part_replacement
     WHERE ${whereClause}`,
    params
  );
  return rows[0];
}

/**
 * Returns a paginated, searchable, sortable list of Part Replacement detail rows.
 */
async function getDetails({
  page = 1,
  pageSize = 25,
  search = '',
  sortBy = 'doc',
  sortDir = 'DESC',
  ageingMin = null,
  ageingMax = null,
  typeOfDamage = '',
  productCategory = '',
  subCategory = '',
  date = '',
} = {}) {
  const allowedSortColumns = [
    'branch', 'spu_status', 'spu_created_date', 'doc', 'doi', 'dop', 'ticket_no',
    'machine_status', 'model', 'serial_number', 'item_code', 'description', 'problem_description',
    'sub_category', 'ageing_days', 'complaint_number',
  ];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'doc';
  const safeSortDir = sortDir && sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage, productCategory, subCategory, date });
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM part_replacement WHERE ${whereClause}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.query(
    `SELECT branch, spu_status, spu_created_date, doc, doi, dop, ticket_no, machine_status, model,
            serial_number, item_code, description, problem_description, sub_category, ageing_days, complaint_number, admin_comment
     FROM part_replacement
     WHERE ${whereClause}
     ORDER BY ${safeSortBy} ${safeSortDir}
     LIMIT ? OFFSET ?`,
    [...params, Number(pageSize), Number(offset)]
  );

  return { rows, total, page: Number(page), pageSize: Number(pageSize) };
}

/**
 * Returns ALL matching detail rows (no pagination) for CSV export.
 */
async function getDetailsForExport({ search = '', ageingMin = null, ageingMax = null, typeOfDamage = '', productCategory = '', subCategory = '', date = '' } = {}) {
  const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage, productCategory, subCategory, date });

  const [rows] = await pool.query(
    `SELECT branch, spu_status, spu_created_date, doc, doi, dop, ticket_no, machine_status, model,
            serial_number, item_code, description, problem_description, sub_category, ageing_days, complaint_number, admin_comment
     FROM part_replacement
     WHERE ${whereClause}
     ORDER BY doc DESC`,
    params
  );
  return rows;
}

/**
 * Updates the admin_comment for a specific part replacement record by serial_number, ticket_no, or complaint_number.
 */
async function updateComment(serialNumber, comment, ticketNo = null, complaintNumber = null) {
  let query = 'UPDATE part_replacement SET admin_comment = ? WHERE serial_number = ?';
  let param = serialNumber;
  if (!param && ticketNo) {
    query = 'UPDATE part_replacement SET admin_comment = ? WHERE ticket_no = ?';
    param = ticketNo;
  } else if (!param && complaintNumber) {
    query = 'UPDATE part_replacement SET admin_comment = ? WHERE complaint_number = ?';
    param = complaintNumber;
  }
  const [result] = await pool.query(query, [comment, param]);
  return result.affectedRows > 0;
}

module.exports = { getSummaryCounts, getDetails, getDetailsForExport, updateComment };
