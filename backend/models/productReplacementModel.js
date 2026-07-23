// ============================================================
// Product Replacement Model (Repository Pattern)
// ------------------------------------------------------------
// All raw SQL for the product_replacement table lives here.
// Services call these functions rather than writing SQL inline,
// keeping query logic centralized and testable.
//
// Business rule enforced at this layer:
//   FD ZBRN STATUS  -> only 'Approved' or 'Approved for Upgrade'
//   TYPE OF DAMAGE   -> only 'Functional'
// Every read from this table applies these two filters so the
// dashboard only ever shows in-scope records.
// ============================================================

const { pool } = require('../database/connection');

const ALLOWED_STATUS = ['Approved', 'Approved for Upgrade'];
const ALLOWED_DAMAGE_TYPE = ['Functional'];
const ALLOWED_MAT_CAT = ['WM', 'WD'];
const ALLOWED_MACHINE_STATUS = ['SW', 'SUW'];

const BASE_WHERE = `
  fd_zbrn_status IN (?, ?)
  AND type_of_damage IN (?)
  AND (mat_cat IN (?, ?) OR mat_cat IS NULL)
  AND (machine_status IN (?, ?) OR machine_status IS NULL)
`;
const BASE_PARAMS = [...ALLOWED_STATUS, ...ALLOWED_DAMAGE_TYPE, ...ALLOWED_MAT_CAT, ...ALLOWED_MACHINE_STATUS];

/**
 * Returns ageing-bucket counts for the summary cards, respecting the
 * mandatory FD ZBRN STATUS / TYPE OF DAMAGE filters.
 */
async function getSummaryCounts() {
  const [rows] = await pool.query(
    `SELECT
        SUM(CASE WHEN ageing_days BETWEEN 0 AND 90 THEN 1 ELSE 0 END)     AS bucket_0_3_months,
        SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 THEN 1 ELSE 0 END)   AS bucket_1_year,
        SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 THEN 1 ELSE 0 END)  AS bucket_2_year,
        SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 THEN 1 ELSE 0 END) AS bucket_3_year,
        SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 THEN 1 ELSE 0 END) AS bucket_4_year,
        SUM(CASE WHEN ageing_days > 1460 THEN 1 ELSE 0 END)               AS bucket_more_than_4_years,
        COUNT(*) AS total
     FROM product_replacement
     WHERE ${BASE_WHERE}`,
    BASE_PARAMS
  );
  return rows[0];
}

/**
 * Returns a paginated, searchable, sortable list of detail rows,
 * optionally scoped to a single ageing bucket (min/max days).
 */
async function getDetails({ page = 1, pageSize = 25, search = '', sortBy = 'doc', sortDir = 'DESC', ageingMin = null, ageingMax = null }) {
  const allowedSortColumns = [
    'complaint_number', 'model', 'branch', 'mat_cat', 'machine_status',
    'serial_number', 'doi', 'doc', 'ageing_days', 'fd_zbrn_status', 'type_of_damage',
  ];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'doc';
  const safeSortDir = sortDir && sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let whereClause = BASE_WHERE;
  const params = [...BASE_PARAMS];

  if (ageingMin !== null && ageingMax !== null) {
    whereClause += ' AND ageing_days BETWEEN ? AND ?';
    params.push(ageingMin, ageingMax);
  }

  if (search) {
    whereClause += ' AND (complaint_number LIKE ? OR model LIKE ? OR serial_number LIKE ? OR branch LIKE ? OR mat_cat LIKE ? OR machine_status LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like);
  }

  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM product_replacement WHERE ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT complaint_number, model, branch, mat_cat, machine_status, serial_number, doi, doc, ageing_days, fd_zbrn_status, type_of_damage
     FROM product_replacement
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
async function getDetailsForExport({ search = '', ageingMin = null, ageingMax = null }) {
  let whereClause = BASE_WHERE;
  const params = [...BASE_PARAMS];

  if (ageingMin !== null && ageingMax !== null) {
    whereClause += ' AND ageing_days BETWEEN ? AND ?';
    params.push(ageingMin, ageingMax);
  }

  if (search) {
    whereClause += ' AND (complaint_number LIKE ? OR model LIKE ? OR serial_number LIKE ? OR branch LIKE ? OR mat_cat LIKE ? OR machine_status LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like);
  }

  const [rows] = await pool.query(
    `SELECT complaint_number, model, branch, mat_cat, machine_status, serial_number, doi, doc, ageing_days, fd_zbrn_status, type_of_damage
     FROM product_replacement
     WHERE ${whereClause}
     ORDER BY doc DESC`,
    params
  );
  return rows;
}

module.exports = { getSummaryCounts, getDetails, getDetailsForExport, ALLOWED_STATUS, ALLOWED_DAMAGE_TYPE };
