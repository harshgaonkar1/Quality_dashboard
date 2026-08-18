// ============================================================
// Part Replacement Model (Repository Pattern)
// ------------------------------------------------------------
// Accesses the part_replacement table using Supabase JS client
// (or PG pool fallback if configured) with defensive error handling.
// ============================================================

const { supabase } = require('../database/supabaseClient');
const { pool } = require('../database/connection');

function buildWhereClause({ search = '', ageingMin = null, ageingMax = null, productCategory = '', subCategory = '', date = '' } = {}) {
  let whereClause = '1=1';
  const params = [];

  const subCatFilter = subCategory || productCategory;
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
    if (ageingMin === 0 && ageingMax === 0) {
      whereClause += ' AND (ageing_days = 0)';
    } else if (ageingMin === 1 && ageingMax === 90) {
      whereClause += ' AND (ageing_days BETWEEN 1 AND 90 OR ageing_days IS NULL OR ageing_days < 0)';
    } else {
      whereClause += ' AND ageing_days BETWEEN ? AND ?';
      params.push(ageingMin, ageingMax);
    }
  }

  if (search) {
    whereClause += ' AND (branch LIKE ? OR spu_status LIKE ? OR ticket_no LIKE ? OR machine_status LIKE ? OR model LIKE ? OR serial_number LIKE ? OR item_code LIKE ? OR description LIKE ? OR problem_description LIKE ? OR complaint_number LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like, like, like, like);
  }

  return { whereClause, params };
}

function applySupabaseFilters(query, { search = '', ageingMin = null, ageingMax = null, productCategory = '', subCategory = '', date = '' }) {
  let q = query;
  const subCatFilter = subCategory || productCategory;

  if (subCatFilter && subCatFilter.trim() !== '' && subCatFilter.toUpperCase() !== 'ALL') {
    const cat = subCatFilter.trim().toUpperCase();
    if (cat === 'TL') {
      q = q.or('sub_category.eq.TL,model.ilike.TL%');
    } else if (cat === 'FL') {
      q = q.or('sub_category.eq.FL,and(model.not.ilike.TL%,or(sub_category.is.null,sub_category.neq.TL))');
    }
  }

  if (date) {
    q = q.or(`spu_created_date.eq.${date},and(spu_created_date.is.null,doc.eq.${date})`);
  }

  if (ageingMin !== null && ageingMax !== null) {
    if (ageingMin === 0 && ageingMax === 0) {
      q = q.eq('ageing_days', 0);
    } else if (ageingMin === 1 && ageingMax === 90) {
      q = q.or('and(ageing_days.gte.1,ageing_days.lte.90),ageing_days.is.null,ageing_days.lt.0');
    } else {
      q = q.gte('ageing_days', ageingMin).lte('ageing_days', ageingMax);
    }
  }

  if (search) {
    const like = `%${search}%`;
    q = q.or(`branch.ilike.${like},spu_status.ilike.${like},ticket_no.ilike.${like},machine_status.ilike.${like},model.ilike.${like},serial_number.ilike.${like},item_code.ilike.${like},description.ilike.${like},problem_description.ilike.${like},complaint_number.ilike.${like}`);
  }

  return q;
}

const EMPTY_COUNTS = {
  bucket_installation_failure: 0, bucket_installation_failure_tl: 0, bucket_installation_failure_fl: 0,
  bucket_0_3_months: 0, bucket_0_3_months_tl: 0, bucket_0_3_months_fl: 0,
  bucket_1_year: 0, bucket_1_year_tl: 0, bucket_1_year_fl: 0,
  bucket_2_year: 0, bucket_2_year_tl: 0, bucket_2_year_fl: 0,
  bucket_3_year: 0, bucket_3_year_tl: 0, bucket_3_year_fl: 0,
  bucket_4_year: 0, bucket_4_year_tl: 0, bucket_4_year_fl: 0,
  bucket_more_than_4_years: 0, bucket_more_than_4_years_tl: 0, bucket_more_than_4_years_fl: 0,
  tl_count: 0, fl_count: 0, total: 0,
};

/**
 * Returns summary counts for Part Replacement.
 */
async function getSummaryCounts({ typeOfDamage = '', productCategory = '', subCategory = '', date = '' } = {}) {
  if (supabase) {
    try {
      let q = supabase.from('part_replacement').select('ageing_days, model, sub_category');
      q = applySupabaseFilters(q, { search: '', ageingMin: null, ageingMax: null, productCategory, subCategory, date });

      const { data: rows, error } = await q;
      if (error) {
        console.warn('⚠️ Supabase part_replacement query notice:', error.message);
        return EMPTY_COUNTS;
      }

      const counts = { ...EMPTY_COUNTS, total: rows ? rows.length : 0 };

      (rows || []).forEach((row) => {
        const days = row.ageing_days;
        const subCat = (row.sub_category || '').toUpperCase();
        const model = (row.model || '').toUpperCase();
        const isTl = subCat === 'TL' || model.startsWith('TL');

        if (isTl) counts.tl_count++;
        else counts.fl_count++;

        if (days === 0 || days === '0') {
          counts.bucket_installation_failure++;
          if (isTl) counts.bucket_installation_failure_tl++; else counts.bucket_installation_failure_fl++;
        } else if (days === null || days === undefined || (days >= 1 && days <= 90)) {
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
      console.warn('⚠️ Supabase part summary error fallback:', e.message);
      return EMPTY_COUNTS;
    }
  }

  try {
    const { whereClause, params } = buildWhereClause({ typeOfDamage, productCategory, subCategory, date });
    const [rows] = await pool.query(
      `SELECT
          SUM(CASE WHEN ageing_days = 0 THEN 1 ELSE 0 END) AS bucket_installation_failure,
          SUM(CASE WHEN ageing_days = 0 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_installation_failure_tl,
          SUM(CASE WHEN ageing_days = 0 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL'))) THEN 1 ELSE 0 END) AS bucket_installation_failure_fl,

          SUM(CASE WHEN (ageing_days IS NULL OR (ageing_days BETWEEN 1 AND 90)) THEN 1 ELSE 0 END) AS bucket_0_3_months,
          SUM(CASE WHEN (ageing_days IS NULL OR (ageing_days BETWEEN 1 AND 90)) AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_0_3_months_tl,
          SUM(CASE WHEN (ageing_days IS NULL OR (ageing_days BETWEEN 1 AND 90)) AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND (sub_category IS NULL OR UPPER(sub_category) != 'TL'))) THEN 1 ELSE 0 END) AS bucket_0_3_months_fl,

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
    return rows[0] || EMPTY_COUNTS;
  } catch (e) {
    console.warn('⚠️ SQL pool part summary error fallback:', e.message);
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
  subCategory = '',
  date = '',
} = {}) {
  const allowedSortColumns = [
    'branch', 'franchise', 'spu_status', 'spu_created_date', 'doc', 'doi', 'dop', 'ticket_no',
    'machine_status', 'model', 'serial_number', 'item_code', 'description', 'problem_description',
    'product_category', 'sub_category', 'approved_qty', 'rej_qty', 'ageing_days', 'complaint_number',
  ];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'doc';
  const safeSortDir = sortDir && sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  if (supabase) {
    try {
      const offset = (page - 1) * pageSize;
      let q = supabase.from('part_replacement').select('*', { count: 'exact' });
      q = applySupabaseFilters(q, { search, ageingMin, ageingMax, productCategory, subCategory, date });
      q = q.order(safeSortBy, { ascending: safeSortDir === 'ASC' }).range(offset, offset + pageSize - 1);

      const { data: rows, count, error } = await q;
      if (error) {
        console.warn('⚠️ Supabase part_replacement details notice:', error.message);
        return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
      }
      return { rows: rows || [], total: count || 0, page: Number(page), pageSize: Number(pageSize) };
    } catch (e) {
      console.warn('⚠️ Supabase part details error fallback:', e.message);
      return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
    }
  }

  try {
    const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage, productCategory, subCategory, date });
    const offset = (page - 1) * pageSize;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM part_replacement WHERE ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.query(
      `SELECT branch, franchise, spu_status, spu_created_date, doc, doi, dop, ticket_no, machine_status, model,
              serial_number, item_code, description, problem_description, product_category, sub_category, approved_qty, rej_qty, ageing_days, complaint_number, admin_comment
       FROM part_replacement
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortDir}
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), Number(offset)]
    );

    return { rows, total, page: Number(page), pageSize: Number(pageSize) };
  } catch (e) {
    console.warn('⚠️ SQL pool part details error fallback:', e.message);
    return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
  }
}

/**
 * Returns all detail rows for export.
 */
async function getDetailsForExport({ search = '', ageingMin = null, ageingMax = null, typeOfDamage = '', productCategory = '', subCategory = '', date = '' } = {}) {
  if (supabase) {
    try {
      let q = supabase.from('part_replacement').select('*').order('doc', { ascending: false });
      q = applySupabaseFilters(q, { search, ageingMin, ageingMax, productCategory, subCategory, date });
      const { data: rows, error } = await q;
      if (error) {
        console.warn('⚠️ Supabase part export notice:', error.message);
        return [];
      }
      return rows || [];
    } catch (e) {
      return [];
    }
  }

  try {
    const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage, productCategory, subCategory, date });
    const [rows] = await pool.query(
      `SELECT branch, franchise, spu_status, spu_created_date, doc, doi, dop, ticket_no, machine_status, model,
              serial_number, item_code, description, problem_description, product_category, sub_category, approved_qty, rej_qty, ageing_days, complaint_number, admin_comment
       FROM part_replacement
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
async function updateComment(serialNumber, comment, ticketNo = null, complaintNumber = null) {
  if (supabase) {
    try {
      let q = supabase.from('part_replacement').update({ admin_comment: comment });
      if (serialNumber) {
        q = q.eq('serial_number', serialNumber);
      } else if (ticketNo) {
        q = q.eq('ticket_no', ticketNo);
      } else if (complaintNumber) {
        q = q.eq('complaint_number', complaintNumber);
      } else {
        return false;
      }
      const { error } = await q;
      if (error) {
        console.warn('⚠️ Supabase part updateComment notice:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  try {
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
  } catch (e) {
    return false;
  }
}

module.exports = { getSummaryCounts, getDetails, getDetailsForExport, updateComment };
