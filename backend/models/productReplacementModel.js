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
const ALLOWED_MAT_CAT = ['WM', 'WD'];
const ALLOWED_MACHINE_STATUS = ['SW'];

const BASE_WHERE = `
  fd_zbrn_status IN (?, ?)
  AND mat_cat IN (?, ?)
  AND machine_status IN (?)
`;
const BASE_PARAMS = [...ALLOWED_STATUS, ...ALLOWED_MAT_CAT, ...ALLOWED_MACHINE_STATUS];

/**
 * Builds standard WHERE clause incorporating optional damage type, ageing range, and search.
 */
function buildWhereClause({ search = '', ageingMin = null, ageingMax = null, typeOfDamage = '' } = {}) {
  let whereClause = BASE_WHERE;
  const params = [...BASE_PARAMS];

  if (typeOfDamage && typeOfDamage.trim() !== '' && typeOfDamage.toUpperCase() !== 'ALL') {
    whereClause += ' AND (LOWER(type_of_damage) LIKE LOWER(?))';
    params.push(`%${typeOfDamage.trim()}%`);
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
    whereClause += ' AND (complaint_number LIKE ? OR model LIKE ? OR serial_number LIKE ? OR branch LIKE ? OR mat_cat LIKE ? OR machine_status LIKE ? OR part_code LIKE ? OR part_description LIKE ? OR survey_origin LIKE ? OR customer_complaint LIKE ? OR customer_first_name LIKE ? OR city LIKE ? OR franchisee_name LIKE ? OR technician_name LIKE ? OR dealer_name LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like, like, like, like, like, like, like, like, like);
  }

  return { whereClause, params };
}

/**
 * Returns ageing-bucket counts for the summary cards, respecting the
 * FD ZBRN STATUS and optional damage type filters.
 */
async function getSummaryCounts({ typeOfDamage = '' } = {}) {
  const { whereClause, params } = buildWhereClause({ typeOfDamage });
  const [rows] = await pool.query(
    `SELECT
        SUM(CASE WHEN ageing_days IS NULL OR ageing_days <= 90 THEN 1 ELSE 0 END) AS bucket_0_3_months,
        SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 THEN 1 ELSE 0 END)   AS bucket_1_year,
        SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 THEN 1 ELSE 0 END)  AS bucket_2_year,
        SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 THEN 1 ELSE 0 END) AS bucket_3_year,
        SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 THEN 1 ELSE 0 END) AS bucket_4_year,
        SUM(CASE WHEN ageing_days > 1460 THEN 1 ELSE 0 END)               AS bucket_more_than_4_years,
        COUNT(*) AS total
     FROM product_replacement
     WHERE ${whereClause}`,
    params
  );
  return rows[0];
}

/**
 * Returns a paginated, searchable, sortable list of detail rows.
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
} = {}) {
  const allowedSortColumns = [
    'complaint_number', 'zmac_date', 'zmac_status', 'fd_zbrn_id', 'fd_zbrn_status', 'fd_zbrn_date',
    'customer_first_name', 'city', 'franchisee_id', 'franchisee_name', 'branch', 'doc', 'ticket_no',
    'call_type', 'machine_status', 'dop', 'doi', 'technician_name', 'technician_no', 'mat_cat',
    'product_id', 'model', 'serial_number', 'survey_origin', 'type_of_damage', 'customer_complaint',
    'part_description', 'part_code', 'out_bound_del', 'out_bound_del_date', 'dealer_code', 'dealer_name',
    'bse_name', 'industry', 'ageing_days',
  ];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'doc';
  const safeSortDir = sortDir && sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage });

  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM product_replacement WHERE ${whereClause}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.query(
    `SELECT complaint_number, zmac_date, zmac_status, fd_zbrn_id, fd_zbrn_status, fd_zbrn_date,
            customer_first_name, city, franchisee_id, franchisee_name, branch, doc, ticket_no,
            call_type, machine_status, dop, doi, technician_name, technician_no, mat_cat,
            product_id, model, serial_number, survey_origin, type_of_damage, customer_complaint,
            part_description, part_code, out_bound_del, out_bound_del_date, dealer_code, dealer_name,
            bse_name, industry, ageing_days
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
async function getDetailsForExport({ search = '', ageingMin = null, ageingMax = null, typeOfDamage = '' } = {}) {
  const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage });

  const [rows] = await pool.query(
    `SELECT complaint_number, zmac_date, zmac_status, fd_zbrn_id, fd_zbrn_status, fd_zbrn_date,
            customer_first_name, city, franchisee_id, franchisee_name, branch, doc, ticket_no,
            call_type, machine_status, dop, doi, technician_name, technician_no, mat_cat,
            product_id, model, serial_number, survey_origin, type_of_damage, customer_complaint,
            part_description, part_code, out_bound_del, out_bound_del_date, dealer_code, dealer_name,
            bse_name, industry, ageing_days
     FROM product_replacement
     WHERE ${whereClause}
     ORDER BY doc DESC`,
    params
  );
  return rows;
}

module.exports = { getSummaryCounts, getDetails, getDetailsForExport, ALLOWED_STATUS };
