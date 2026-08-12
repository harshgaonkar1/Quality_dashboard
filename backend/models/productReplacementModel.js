// ============================================================
// Product Replacement Model (Repository Pattern)
// ------------------------------------------------------------
// Accesses the product_replacement table using Supabase JS client
// (or PG pool fallback if configured) with defensive error handling.
// ============================================================

const { supabase } = require('../database/supabaseClient');
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

function buildWhereClause({ search = '', ageingMin = null, ageingMax = null, typeOfDamage = '', productCategory = '', date = '' } = {}) {
  let whereClause = BASE_WHERE;
  const params = [...BASE_PARAMS];

  if (typeOfDamage && typeOfDamage.trim() !== '' && typeOfDamage.toUpperCase() !== 'ALL') {
    whereClause += ' AND (LOWER(type_of_damage) LIKE LOWER(?))';
    params.push(`%${typeOfDamage.trim()}%`);
  }

  if (productCategory && productCategory.trim() !== '' && productCategory.toUpperCase() !== 'ALL') {
    const cat = productCategory.trim().toUpperCase();
    if (cat === 'TL') {
      whereClause += " AND (UPPER(model) LIKE 'TL%')";
    } else if (cat === 'FL') {
      whereClause += " AND (UPPER(model) NOT LIKE 'TL%' OR model IS NULL)";
    }
  }

  if (date) {
    whereClause += ' AND (DATE(zmac_date) = ? OR (zmac_date IS NULL AND DATE(doc) = ?))';
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
    whereClause += ' AND (complaint_number LIKE ? OR fd_zbrn_id LIKE ? OR branch LIKE ? OR ticket_no LIKE ? OR machine_status LIKE ? OR model LIKE ? OR serial_number LIKE ? OR part_code LIKE ? OR part_description LIKE ? OR customer_complaint LIKE ? OR dealer_name LIKE ? OR bse_name LIKE ? OR industry LIKE ? OR survey_origin LIKE ? OR type_of_damage LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like, like, like, like, like, like, like, like, like);
  }

  return { whereClause, params };
}

function applySupabaseFilters(query, { search = '', ageingMin = null, ageingMax = null, typeOfDamage = '', productCategory = '', date = '' }) {
  let q = query
    .in('fd_zbrn_status', ALLOWED_STATUS)
    .in('mat_cat', ALLOWED_MAT_CAT)
    .in('machine_status', ALLOWED_MACHINE_STATUS);

  if (typeOfDamage && typeOfDamage.trim() !== '' && typeOfDamage.toUpperCase() !== 'ALL') {
    q = q.ilike('type_of_damage', `%${typeOfDamage.trim()}%`);
  }

  if (productCategory && productCategory.trim() !== '' && productCategory.toUpperCase() !== 'ALL') {
    const cat = productCategory.trim().toUpperCase();
    if (cat === 'TL') {
      q = q.ilike('model', 'TL%');
    } else if (cat === 'FL') {
      q = q.or('model.is.null,model.not.ilike.TL%');
    }
  }

  if (date) {
    q = q.or(`zmac_date.eq.${date},and(zmac_date.is.null,doc.eq.${date})`);
  }

  if (ageingMin !== null && ageingMax !== null) {
    if (ageingMin === 0 && ageingMax === 90) {
      q = q.or('and(ageing_days.gte.0,ageing_days.lte.90),ageing_days.is.null,ageing_days.lt.0');
    } else {
      q = q.gte('ageing_days', ageingMin).lte('ageing_days', ageingMax);
    }
  }

  if (search) {
    const like = `%${search}%`;
    q = q.or(`complaint_number.ilike.${like},fd_zbrn_id.ilike.${like},branch.ilike.${like},ticket_no.ilike.${like},model.ilike.${like},serial_number.ilike.${like},part_code.ilike.${like},part_description.ilike.${like},customer_complaint.ilike.${like},dealer_name.ilike.${like},bse_name.ilike.${like},industry.ilike.${like}`);
  }

  return q;
}

const EMPTY_COUNTS = {
  bucket_0_3_months: 0, bucket_0_3_months_tl: 0, bucket_0_3_months_fl: 0,
  bucket_1_year: 0, bucket_1_year_tl: 0, bucket_1_year_fl: 0,
  bucket_2_year: 0, bucket_2_year_tl: 0, bucket_2_year_fl: 0,
  bucket_3_year: 0, bucket_3_year_tl: 0, bucket_3_year_fl: 0,
  bucket_4_year: 0, bucket_4_year_tl: 0, bucket_4_year_fl: 0,
  bucket_more_than_4_years: 0, bucket_more_than_4_years_tl: 0, bucket_more_than_4_years_fl: 0,
  tl_count: 0, fl_count: 0, total: 0,
};

/**
 * Returns summary counts.
 */
async function getSummaryCounts({ typeOfDamage = '', productCategory = '', date = '' } = {}) {
  if (supabase) {
    try {
      let q = supabase.from('product_replacement').select('ageing_days, model');
      q = applySupabaseFilters(q, { typeOfDamage, productCategory, date });

      const { data: rows, error } = await q;
      if (error) {
        console.warn('⚠️ Supabase product_replacement query notice:', error.message);
        return EMPTY_COUNTS;
      }

      const counts = { ...EMPTY_COUNTS, total: rows ? rows.length : 0 };

      (rows || []).forEach((row) => {
        const days = row.ageing_days;
        const isTl = row.model && row.model.toUpperCase().startsWith('TL');

        if (isTl) counts.tl_count++;
        else counts.fl_count++;

        if (days === null || days === undefined || days <= 90) {
          counts.bucket_0_3_months++;
          if (isTl) counts.bucket_0_3_months_tl++; else counts.bucket_0_3_months_fl++;
        } else if (days >= 91 && days <= 365) {
          counts.bucket_1_year++;
          if (isTl) counts.bucket_1_year_tl++; else counts.bucket_1_year_fl++;
        } else if (days >= 366 && days <= 730) {
          counts.bucket_2_year++;
          if (isTl) counts.bucket_2_year_tl++; else counts.bucket_2_year_fl++;
        } else if (days >= 731 && days <= 1095) {
          counts.bucket_3_year++;
          if (isTl) counts.bucket_3_year_tl++; else counts.bucket_3_year_fl++;
        } else if (days >= 1096 && days <= 1460) {
          counts.bucket_4_year++;
          if (isTl) counts.bucket_4_year_tl++; else counts.bucket_4_year_fl++;
        } else if (days > 1460) {
          counts.bucket_more_than_4_years++;
          if (isTl) counts.bucket_more_than_4_years_tl++; else counts.bucket_more_than_4_years_fl++;
        }
      });

      return counts;
    } catch (e) {
      console.warn('⚠️ Supabase summary error fallback:', e.message);
      return EMPTY_COUNTS;
    }
  }

  try {
    const { whereClause, params } = buildWhereClause({ typeOfDamage, productCategory, date });
    const [rows] = await pool.query(
      `SELECT
          SUM(CASE WHEN ageing_days IS NULL OR ageing_days <= 90 THEN 1 ELSE 0 END) AS bucket_0_3_months,
          SUM(CASE WHEN (ageing_days IS NULL OR ageing_days <= 90) AND UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END) AS bucket_0_3_months_tl,
          SUM(CASE WHEN (ageing_days IS NULL OR ageing_days <= 90) AND (UPPER(model) NOT LIKE 'TL%' OR model IS NULL) THEN 1 ELSE 0 END) AS bucket_0_3_months_fl,

          SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 THEN 1 ELSE 0 END)   AS bucket_1_year,
          SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 AND UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END) AS bucket_1_year_tl,
          SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 AND (UPPER(model) NOT LIKE 'TL%' OR model IS NULL) THEN 1 ELSE 0 END) AS bucket_1_year_fl,

          SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 THEN 1 ELSE 0 END)  AS bucket_2_year,
          SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 AND UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END) AS bucket_2_year_tl,
          SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 AND (UPPER(model) NOT LIKE 'TL%' OR model IS NULL) THEN 1 ELSE 0 END) AS bucket_2_year_fl,

          SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 THEN 1 ELSE 0 END) AS bucket_3_year,
          SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 AND UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END) AS bucket_3_year_tl,
          SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 AND (UPPER(model) NOT LIKE 'TL%' OR model IS NULL) THEN 1 ELSE 0 END) AS bucket_3_year_fl,

          SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 THEN 1 ELSE 0 END) AS bucket_4_year,
          SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 AND UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END) AS bucket_4_year_tl,
          SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 AND (UPPER(model) NOT LIKE 'TL%' OR model IS NULL) THEN 1 ELSE 0 END) AS bucket_4_year_fl,

          SUM(CASE WHEN ageing_days > 1460 THEN 1 ELSE 0 END)               AS bucket_more_than_4_years,
          SUM(CASE WHEN ageing_days > 1460 AND UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END) AS bucket_more_than_4_years_tl,
          SUM(CASE WHEN ageing_days > 1460 AND (UPPER(model) NOT LIKE 'TL%' OR model IS NULL) THEN 1 ELSE 0 END) AS bucket_more_than_4_years_fl,

          SUM(CASE WHEN UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END)          AS tl_count,
          SUM(CASE WHEN UPPER(model) NOT LIKE 'TL%' OR model IS NULL THEN 1 ELSE 0 END) AS fl_count,
          COUNT(*) AS total
       FROM product_replacement
       WHERE ${whereClause}`,
      params
    );
    return rows[0] || EMPTY_COUNTS;
  } catch (e) {
    console.warn('⚠️ SQL pool summary error fallback:', e.message);
    return EMPTY_COUNTS;
  }
}

/**
 * Returns paginated details.
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
  date = '',
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

  if (supabase) {
    try {
      const offset = (page - 1) * pageSize;
      let q = supabase.from('product_replacement').select('*', { count: 'exact' });
      q = applySupabaseFilters(q, { search, ageingMin, ageingMax, typeOfDamage, productCategory, date });
      q = q.order(safeSortBy, { ascending: safeSortDir === 'ASC' }).range(offset, offset + pageSize - 1);

      const { data: rows, count, error } = await q;
      if (error) {
        console.warn('⚠️ Supabase product_replacement details notice:', error.message);
        return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
      }
      return { rows: rows || [], total: count || 0, page: Number(page), pageSize: Number(pageSize) };
    } catch (e) {
      console.warn('⚠️ Supabase details error fallback:', e.message);
      return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
    }
  }

  try {
    const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage, productCategory, date });
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
              bse_name, industry, ageing_days, admin_comment
       FROM product_replacement
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortDir}
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), Number(offset)]
    );

    return { rows, total, page: Number(page), pageSize: Number(pageSize) };
  } catch (e) {
    console.warn('⚠️ SQL pool details error fallback:', e.message);
    return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
  }
}

/**
 * Returns all detail rows for export.
 */
async function getDetailsForExport({ search = '', ageingMin = null, ageingMax = null, typeOfDamage = '', productCategory = '', date = '' } = {}) {
  if (supabase) {
    try {
      let q = supabase.from('product_replacement').select('*').order('doc', { ascending: false });
      q = applySupabaseFilters(q, { search, ageingMin, ageingMax, typeOfDamage, productCategory, date });
      const { data: rows, error } = await q;
      if (error) {
        console.warn('⚠️ Supabase export notice:', error.message);
        return [];
      }
      return rows || [];
    } catch (e) {
      return [];
    }
  }

  try {
    const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage, productCategory, date });
    const [rows] = await pool.query(
      `SELECT complaint_number, zmac_date, zmac_status, fd_zbrn_id, fd_zbrn_status, fd_zbrn_date,
              customer_first_name, city, franchisee_id, franchisee_name, branch, doc, ticket_no,
              call_type, machine_status, dop, doi, technician_name, technician_no, mat_cat,
              product_id, model, serial_number, survey_origin, type_of_damage, customer_complaint,
              part_description, part_code, out_bound_del, out_bound_del_date, dealer_code, dealer_name,
              bse_name, industry, ageing_days, admin_comment
       FROM product_replacement
       WHERE ${whereClause}
       ORDER BY doc DESC`,
      params
    );
    return rows;
  } catch (e) {
    return [];
  }
}

/**
 * Updates admin comment.
 */
async function updateComment(serialNumber, comment, complaintNumber = null) {
  if (supabase) {
    try {
      let q = supabase.from('product_replacement').update({ admin_comment: comment });
      if (serialNumber) {
        q = q.eq('serial_number', serialNumber);
      } else if (complaintNumber) {
        q = q.eq('complaint_number', complaintNumber);
      } else {
        return false;
      }
      const { error } = await q;
      if (error) {
        console.warn('⚠️ Supabase updateComment notice:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  try {
    let query = 'UPDATE product_replacement SET admin_comment = ? WHERE serial_number = ?';
    let param = serialNumber;
    if (!param && complaintNumber) {
      query = 'UPDATE product_replacement SET admin_comment = ? WHERE complaint_number = ?';
      param = complaintNumber;
    }
    const [result] = await pool.query(query, [comment, param]);
    return result.affectedRows > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Returns the latest date in product_replacement table as YYYY-MM-DD string.
 */
async function getLatestDate() {
  if (supabase) {
    try {
      const { data: rows, error } = await supabase
        .from('product_replacement')
        .select('zmac_date, doc')
        .in('fd_zbrn_status', ALLOWED_STATUS)
        .in('mat_cat', ALLOWED_MAT_CAT)
        .in('machine_status', ALLOWED_MACHINE_STATUS)
        .order('zmac_date', { ascending: false })
        .limit(5);

      if (!error && rows && rows.length > 0) {
        for (const r of rows) {
          const raw = r.zmac_date || r.doc;
          if (raw) {
            const dateStr = String(raw).split('T')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Supabase getLatestDate notice:', e.message);
    }
  }

  try {
    const [rows] = await pool.query(
      `SELECT DATE(COALESCE(zmac_date, doc)) AS latest_date
       FROM product_replacement
       WHERE fd_zbrn_status IN (?, ?)
         AND mat_cat IN (?, ?)
         AND machine_status IN (?)
         AND (zmac_date IS NOT NULL OR doc IS NOT NULL)
       ORDER BY COALESCE(zmac_date, doc) DESC
       LIMIT 1`,
      BASE_PARAMS
    );
    if (rows && rows[0] && rows[0].latest_date) {
      const d = new Date(rows[0].latest_date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch (e) {
    console.warn('⚠️ SQL getLatestDate notice:', e.message);
  }
  return null;
}

module.exports = { getSummaryCounts, getDetails, getDetailsForExport, updateComment, getLatestDate, ALLOWED_STATUS };
