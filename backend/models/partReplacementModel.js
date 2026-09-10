// ============================================================
// Part Replacement Model (Repository Pattern)
// ------------------------------------------------------------
// Accesses the part_replacement table using Supabase JS client
// (or PG pool fallback if configured) with defensive error handling.
// ============================================================

const { supabase } = require('../database/supabaseClient');
const { pool } = require('../database/connection');
const { parseFlexibleDate, toMySQLDate } = require('../utils/dateUtils');

function parsePartCategoryList(categoryStr) {
  if (!categoryStr || typeof categoryStr !== 'string') return [];
  const rawList = categoryStr.split(/[,|+_]/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  const selected = new Set();
  for (const s of rawList) {
    if (s === 'ALL') return [];
    if (s === 'TL' || s === 'TLU' || s === 'TLM') selected.add('TL');
    else if (s === 'FL' || s === 'FLU') selected.add('FL');
    else if (s === 'MW' || s === 'MWO' || s === 'MICROWAVE' || s === 'MWU') selected.add('MW');
    else if (s === 'NO_MW' || s === 'EXCLUDE_MW') {
      selected.add('TL');
      selected.add('FL');
    }
  }
  return Array.from(selected);
}

function buildWhereClause({ search = '', ageingMin = null, ageingMax = null, productCategory = '', subCategory = '', date = '' } = {}) {
  let whereClause = '1=1';
  const params = [];

  const subCatFilter = subCategory || productCategory;
  const selectedCats = parsePartCategoryList(subCatFilter);
  if (selectedCats.length > 0 && selectedCats.length < 3) {
    const conditions = [];
    if (selectedCats.includes('TL')) {
      conditions.push("(UPPER(COALESCE(sub_category, '')) IN ('TL', 'TLU', 'TLM') OR UPPER(COALESCE(model, '')) LIKE 'TL%')");
    }
    if (selectedCats.includes('FL')) {
      conditions.push("(UPPER(COALESCE(sub_category, '')) IN ('FL', 'FLU') OR UPPER(COALESCE(model, '')) LIKE 'FL%' OR (UPPER(COALESCE(model, '')) NOT LIKE 'TL%' AND UPPER(COALESCE(model, '')) NOT LIKE 'MW%' AND UPPER(COALESCE(sub_category, '')) NOT IN ('TL', 'TLU', 'TLM', 'MW', 'MWO', 'MICROWAVE', 'MWU')))");
    }
    if (selectedCats.includes('MW')) {
      conditions.push("(UPPER(COALESCE(sub_category, '')) IN ('MW', 'MWO', 'MICROWAVE', 'MWU') OR UPPER(COALESCE(model, '')) LIKE 'MW%')");
    }
    if (conditions.length > 0) {
      whereClause += ` AND (${conditions.join(' OR ')})`;
    }
  }

  if (date && date !== 'latest' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m1, m2] = date.split('-');
    const altDate = `${y}-${m2}-${m1}`;
    whereClause += ' AND (DATE(spu_created_date) = ? OR DATE(spu_created_date) = ? OR (spu_created_date IS NULL AND (DATE(doc) = ? OR DATE(doc) = ?)))';
    params.push(date, altDate, date, altDate);
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
    whereClause += ' AND (branch LIKE ? OR franchise LIKE ? OR spu_status LIKE ? OR ticket_no LIKE ? OR machine_status LIKE ? OR model LIKE ? OR serial_number LIKE ? OR item_code LIKE ? OR description LIKE ? OR complaint_number LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like, like, like, like);
  }

  return { whereClause, params };
}

function applySupabaseFilters(query, { search = '', ageingMin = null, ageingMax = null, productCategory = '', subCategory = '', date = '' }) {
  let q = query;
  const subCatFilter = subCategory || productCategory;
  const selectedCats = parsePartCategoryList(subCatFilter);

  if (selectedCats.length > 0 && selectedCats.length < 3) {
    if (selectedCats.length === 1) {
      const cat = selectedCats[0];
      if (cat === 'TL') {
        q = q.or('sub_category.eq.TL,sub_category.eq.TLU,sub_category.eq.TLM,model.ilike.TL%');
      } else if (cat === 'MW') {
        q = q.or('sub_category.eq.MW,sub_category.eq.MWO,sub_category.eq.MICROWAVE,sub_category.eq.MWU,model.ilike.MW%');
      } else if (cat === 'FL') {
        q = q.or('sub_category.eq.FL,sub_category.eq.FLU,sub_category.eq.Flu,model.ilike.FL%')
             .not('sub_category', 'in', '("MW","MWO","MICROWAVE","MWU","TL","TLU","TLM")')
             .not('model', 'ilike', 'TL%')
             .not('model', 'ilike', 'MW%');
      }
    } else if (selectedCats.length === 2) {
      if (selectedCats.includes('TL') && selectedCats.includes('FL')) {
        q = q.not('sub_category', 'in', '("MW","MWO","MICROWAVE","MWU")').not('model', 'ilike', 'MW%');
      } else if (selectedCats.includes('TL') && selectedCats.includes('MW')) {
        q = q.or('sub_category.eq.TL,sub_category.eq.TLU,sub_category.eq.TLM,model.ilike.TL%,sub_category.eq.MW,sub_category.eq.MWO,sub_category.eq.MICROWAVE,sub_category.eq.MWU,model.ilike.MW%');
      } else if (selectedCats.includes('FL') && selectedCats.includes('MW')) {
        q = q.not('sub_category', 'in', '("TL","TLU","TLM")').not('model', 'ilike', 'TL%');
      }
    }
  }

  if (date && date !== 'latest' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m1, m2] = date.split('-');
    const altDate = `${y}-${m2}-${m1}`;
    q = q.or(`spu_created_date.eq.${date},spu_created_date.eq.${altDate},and(spu_created_date.is.null,or(doc.eq.${date},doc.eq.${altDate}))`);
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
    q = q.or(`branch.ilike.${like},franchise.ilike.${like},spu_status.ilike.${like},ticket_no.ilike.${like},machine_status.ilike.${like},model.ilike.${like},serial_number.ilike.${like},item_code.ilike.${like},description.ilike.${like},complaint_number.ilike.${like}`);
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
      let q = supabase.from('part_replacement').select('ageing_days, model, sub_category, approved_qty, raw_payload');
      q = applySupabaseFilters(q, { search: '', ageingMin: null, ageingMax: null, productCategory, subCategory, date });

      const { data: rows, error } = await q;
      if (error) {
        console.warn('⚠️ Supabase part_replacement query notice:', error.message);
        return EMPTY_COUNTS;
      }

      const counts = { ...EMPTY_COUNTS, total: 0 };

      (rows || []).forEach((row) => {
        const days = row.ageing_days;
        const subCat = (row.sub_category || '').toUpperCase();
        const model = (row.model || '').toUpperCase();
        const isTl = subCat === 'TL' || subCat === 'TLU' || subCat === 'TLM' || model.startsWith('TL');
        const isMw = subCat === 'MW' || subCat === 'MWO' || subCat === 'MICROWAVE' || subCat === 'MWU' || model.startsWith('MW');
        const isFl = subCat === 'FL' || subCat === 'FLU' || model.startsWith('FL') || (!isTl && !isMw);

        counts.total += 1;
        if (isTl) counts.tl_count += 1;
        else if (isFl && !isMw) counts.fl_count += 1;

        if (days === 0 || days === '0') {
          counts.bucket_installation_failure += 1;
          if (isTl) counts.bucket_installation_failure_tl += 1; else counts.bucket_installation_failure_fl += 1;
        } else if (days === null || days === undefined || (days >= 1 && days <= 90)) {
          counts.bucket_0_3_months += 1;
          if (isTl) counts.bucket_0_3_months_tl += 1; else counts.bucket_0_3_months_fl += 1;
        } else if (days >= 91 && days <= 365) {
          counts.bucket_1_year += 1;
          if (isTl) counts.bucket_1_year_tl += 1; else counts.bucket_1_year_fl += 1;
        } else if (days >= 366 && days <= 730) {
          counts.bucket_2_year += 1;
          if (isTl) counts.bucket_2_year_tl += 1; else counts.bucket_2_year_fl += 1;
        } else if (days >= 731 && days <= 1095) {
          counts.bucket_3_year += 1;
          if (isTl) counts.bucket_3_year_tl += 1; else counts.bucket_3_year_fl += 1;
        } else if (days >= 1096 && days <= 1460) {
          counts.bucket_4_year += 1;
          if (isTl) counts.bucket_4_year_tl += 1; else counts.bucket_4_year_fl += 1;
        } else if (days > 1460) {
          counts.bucket_more_than_4_years += 1;
          if (isTl) counts.bucket_more_than_4_years_tl += 1; else counts.bucket_more_than_4_years_fl += 1;
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
          SUM(CASE WHEN ageing_days = 0 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND UPPER(model) NOT LIKE 'MW%' AND (sub_category IS NULL OR (UPPER(sub_category) != 'TL' AND UPPER(sub_category) != 'MW' AND UPPER(sub_category) != 'MWO')))) THEN 1 ELSE 0 END) AS bucket_installation_failure_fl,

          SUM(CASE WHEN (ageing_days IS NULL OR (ageing_days BETWEEN 1 AND 90)) THEN 1 ELSE 0 END) AS bucket_0_3_months,
          SUM(CASE WHEN (ageing_days IS NULL OR (ageing_days BETWEEN 1 AND 90)) AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_0_3_months_tl,
          SUM(CASE WHEN (ageing_days IS NULL OR (ageing_days BETWEEN 1 AND 90)) AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND UPPER(model) NOT LIKE 'MW%' AND (sub_category IS NULL OR (UPPER(sub_category) != 'TL' AND UPPER(sub_category) != 'MW' AND UPPER(sub_category) != 'MWO')))) THEN 1 ELSE 0 END) AS bucket_0_3_months_fl,

          SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 THEN 1 ELSE 0 END)   AS bucket_1_year,
          SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_1_year_tl,
          SUM(CASE WHEN ageing_days BETWEEN 91 AND 365 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND UPPER(model) NOT LIKE 'MW%' AND (sub_category IS NULL OR (UPPER(sub_category) != 'TL' AND UPPER(sub_category) != 'MW' AND UPPER(sub_category) != 'MWO')))) THEN 1 ELSE 0 END) AS bucket_1_year_fl,

          SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 THEN 1 ELSE 0 END)  AS bucket_2_year,
          SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_2_year_tl,
          SUM(CASE WHEN ageing_days BETWEEN 366 AND 730 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND UPPER(model) NOT LIKE 'MW%' AND (sub_category IS NULL OR (UPPER(sub_category) != 'TL' AND UPPER(sub_category) != 'MW' AND UPPER(sub_category) != 'MWO')))) THEN 1 ELSE 0 END) AS bucket_2_year_fl,

          SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 THEN 1 ELSE 0 END) AS bucket_3_year,
          SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_3_year_tl,
          SUM(CASE WHEN ageing_days BETWEEN 731 AND 1095 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND UPPER(model) NOT LIKE 'MW%' AND (sub_category IS NULL OR (UPPER(sub_category) != 'TL' AND UPPER(sub_category) != 'MW' AND UPPER(sub_category) != 'MWO')))) THEN 1 ELSE 0 END) AS bucket_3_year_fl,

          SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 THEN 1 ELSE 0 END) AS bucket_4_year,
          SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_4_year_tl,
          SUM(CASE WHEN ageing_days BETWEEN 1096 AND 1460 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND UPPER(model) NOT LIKE 'MW%' AND (sub_category IS NULL OR (UPPER(sub_category) != 'TL' AND UPPER(sub_category) != 'MW' AND UPPER(sub_category) != 'MWO')))) THEN 1 ELSE 0 END) AS bucket_4_year_fl,

          SUM(CASE WHEN ageing_days > 1460 THEN 1 ELSE 0 END)               AS bucket_more_than_4_years,
          SUM(CASE WHEN ageing_days > 1460 AND (UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%') THEN 1 ELSE 0 END) AS bucket_more_than_4_years_tl,
          SUM(CASE WHEN ageing_days > 1460 AND (UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND UPPER(model) NOT LIKE 'MW%' AND (sub_category IS NULL OR (UPPER(sub_category) != 'TL' AND UPPER(sub_category) != 'MW' AND UPPER(sub_category) != 'MWO')))) THEN 1 ELSE 0 END) AS bucket_more_than_4_years_fl,

          SUM(CASE WHEN UPPER(sub_category) = 'TL' OR UPPER(model) LIKE 'TL%' THEN 1 ELSE 0 END) AS tl_count,
          SUM(CASE WHEN UPPER(sub_category) = 'FL' OR (UPPER(model) NOT LIKE 'TL%' AND UPPER(model) NOT LIKE 'MW%' AND (sub_category IS NULL OR (UPPER(sub_category) != 'TL' AND UPPER(sub_category) != 'MW' AND UPPER(sub_category) != 'MWO'))) THEN 1 ELSE 0 END) AS fl_count,
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
  sortBy = 'spu_created_date',
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
    'part_grouping', 'admin_comment'
  ];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'spu_created_date';
  const safeSortDir = sortDir && sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const lookupMap = await getPartGroupingLookupMap();

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
      const enrichedRows = (rows || []).map((r) => enrichRowWithLookup(r, lookupMap));
      return { rows: enrichedRows, total: count || 0, page: Number(page), pageSize: Number(pageSize) };
    } catch (e) {
      console.warn('⚠️ Supabase part details error fallback:', e.message);
      return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
    }
  }

  if (pool) {
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
                serial_number, item_code, description, problem_description, product_category, sub_category, approved_qty, rej_qty, ageing_days, complaint_number, admin_comment, part_grouping, raw_payload
         FROM part_replacement
         WHERE ${whereClause}
         ORDER BY ${safeSortBy} ${safeSortDir}
         LIMIT ? OFFSET ?`,
        [...params, Number(pageSize), Number(offset)]
      );

      const enrichedRows = (rows || []).map((r) => enrichRowWithLookup(r, lookupMap));
      return { rows: enrichedRows, total, page: Number(page), pageSize: Number(pageSize) };
    } catch (e) {
      console.warn('⚠️ SQL pool part details error fallback:', e.message);
      return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
    }
  }

  return { rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) };
}

/**
 * Returns all detail rows for export.
 */
async function getDetailsForExport({ search = '', ageingMin = null, ageingMax = null, typeOfDamage = '', productCategory = '', subCategory = '', date = '' } = {}) {
  const lookupMap = await getPartGroupingLookupMap();

  if (supabase) {
    try {
      let q = supabase.from('part_replacement').select('*').order('spu_created_date', { ascending: false });
      q = applySupabaseFilters(q, { search, ageingMin, ageingMax, productCategory, subCategory, date });
      const { data: rows, error } = await q;
      if (error) {
        console.warn('⚠️ Supabase part export notice:', error.message);
        return [];
      }
      return (rows || []).map((r) => enrichRowWithLookup(r, lookupMap));
    } catch (e) {
      return [];
    }
  }

  if (pool) {
    try {
      const { whereClause, params } = buildWhereClause({ search, ageingMin, ageingMax, typeOfDamage, productCategory, subCategory, date });
      const [rows] = await pool.query(
        `SELECT branch, franchise, spu_status, spu_created_date, doc, doi, dop, ticket_no, machine_status, model,
                serial_number, item_code, description, problem_description, product_category, sub_category, approved_qty, rej_qty, ageing_days, complaint_number, admin_comment, part_grouping, raw_payload
         FROM part_replacement
         WHERE ${whereClause}
         ORDER BY COALESCE(spu_created_date, doc) DESC`,
        params
      );
      return (rows || []).map((r) => enrichRowWithLookup(r, lookupMap));
    } catch (e) {
      return [];
    }
  }

  return [];
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

/**
 * Returns the latest date in part_replacement table as YYYY-MM-DD string from spu_created_date (supports YYYY-DD-MM).
 */
async function getLatestDate() {
  if (supabase) {
    try {
      const { data: rows, error } = await supabase
        .from('part_replacement')
        .select('spu_created_date')
        .not('spu_created_date', 'is', null)
        .order('spu_created_date', { ascending: false })
        .limit(30);

      if (!error && rows && rows.length > 0) {
        let maxTime = -Infinity;
        let latestStr = null;

        for (const r of rows) {
          const raw = r.spu_created_date;
          if (raw) {
            const parsed = parseFlexibleDate(raw, { preferYyyyDdMm: true });
            if (parsed && !isNaN(parsed.getTime())) {
              if (parsed.getTime() > maxTime) {
                maxTime = parsed.getTime();
                latestStr = toMySQLDate(parsed);
              }
            } else {
              const str = String(raw).split('T')[0];
              if (/^\d{4}-\d{2}-\d{2}$/.test(str) && !latestStr) {
                latestStr = str;
              }
            }
          }
        }
        if (latestStr) return latestStr;
      }

      // Fallback to checking doc only if spu_created_date was null on all rows
      const { data: fallbackRows, error: fallbackError } = await supabase
        .from('part_replacement')
        .select('doc')
        .not('doc', 'is', null)
        .order('doc', { ascending: false })
        .limit(10);

      if (!fallbackError && fallbackRows && fallbackRows.length > 0) {
        for (const r of fallbackRows) {
          const raw = r.doc;
          if (raw) {
            const parsed = parseFlexibleDate(raw);
            if (parsed && !isNaN(parsed.getTime())) return toMySQLDate(parsed);
            const dateStr = String(raw).split('T')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Supabase part getLatestDate notice:', e.message);
    }
  }

  if (pool) {
    try {
      const [rows] = await pool.query(
        `SELECT spu_created_date
         FROM part_replacement
         WHERE spu_created_date IS NOT NULL
         ORDER BY spu_created_date DESC
         LIMIT 30`
      );
      if (rows && rows.length > 0) {
        let maxTime = -Infinity;
        let latestStr = null;
        for (const r of rows) {
          const raw = r.spu_created_date;
          if (raw) {
            const parsed = parseFlexibleDate(raw, { preferYyyyDdMm: true });
            if (parsed && !isNaN(parsed.getTime())) {
              if (parsed.getTime() > maxTime) {
                maxTime = parsed.getTime();
                latestStr = toMySQLDate(parsed);
              }
            }
          }
        }
        if (latestStr) return latestStr;
      }

      const [fallbackRows] = await pool.query(
        `SELECT DATE(doc) AS latest_date
         FROM part_replacement
         WHERE doc IS NOT NULL
         ORDER BY doc DESC
         LIMIT 1`
      );
      if (fallbackRows && fallbackRows[0] && fallbackRows[0].latest_date) {
        const d = new Date(fallbackRows[0].latest_date);
        return toMySQLDate(d);
      }
    } catch (e) {
      console.warn('⚠️ SQL part getLatestDate notice:', e.message);
    }
  }
  return null;
}

/**
 * Extracts part code from any row object (handling 'partcode', 'part_code', 'item_code', etc.)
 */
function getPartCodeFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  const exactKeys = [
    'partcode', 'part_code', 'PartCode', 'Part_Code', 'PARTCODE', 'PART_CODE',
    'part code', 'Part Code', 'item_code', 'itemcode', 'Item_Code', 'ItemCode',
    'ITEM_CODE', 'ITEMCODE', 'item code', 'Item Code', 'code', 'Code', 'CODE',
    'part_no', 'partno', 'Part_No', 'PartNo'
  ];
  for (const k of exactKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if ((key === 'partcode' || key === 'part_code' || key === 'itemcode' || key === 'item_code' || key === 'code' || key === 'partno') && v) {
      return String(v).trim();
    }
  }
  return '';
}

/**
 * Extracts part name / description from any row object.
 */
function getPartNameFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  const exactKeys = [
    'partname', 'part_name', 'PartName', 'Part_Name', 'PARTNAME', 'PART_NAME',
    'part name', 'Part Name', 'description', 'Description', 'part_description', 'part description',
    'name', 'Name'
  ];
  for (const k of exactKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if ((key === 'partname' || key === 'description' || key === 'partdescription' || key === 'name') && v) {
      return String(v).trim();
    }
  }
  return '';
}

/**
 * Extracts grouping name from any row object (handling 'grouping name', 'groupingname', 'grouping_name', 'part_grouping', etc.)
 */
function getGroupingNameFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  const exactKeys = [
    'grouping name', 'Grouping Name', 'Grouping name', 'grouping Name', 'GROUPING NAME',
    'groupingname', 'GroupingName', 'GROUPINGNAME', 'grouping_name', 'Grouping_Name', 'GROUPING_NAME',
    'part_grouping', 'Part_Grouping', 'PART_GROUPING', 'Part Grouping', 'part grouping', 'PART GROUPING',
    'part_group', 'Part_Group', 'PART_GROUP', 'Part Group', 'part group',
    'grouping', 'Grouping', 'GROUPING', 'group_name', 'Group_Name', 'GROUP_NAME', 'Group Name', 'group name',
    'group', 'Group', 'GROUP'
  ];
  for (const k of exactKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if ((key.includes('grouping') || key.includes('group')) && !key.includes('code') && !key.includes('id')) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
  }
  return '';
}

/**
 * Helper to enrich a single part replacement row with the QA lookup from part_grouping table.
 */
function enrichRowWithLookup(row, lookupMap) {
  if (!row) return row;
  let rawPayloadObj = row.raw_payload;
  if (typeof rawPayloadObj === 'string') {
    try { rawPayloadObj = JSON.parse(rawPayloadObj); } catch (e) { rawPayloadObj = null; }
  }

  const itemCode = (row.item_code && String(row.item_code).trim()) || '';
  const partCode = (row.part_code && String(row.part_code).trim()) || '';
  const payloadPartCode = (rawPayloadObj && (rawPayloadObj['Part Code'] || rawPayloadObj['part_code'] || rawPayloadObj['PartCode'] || rawPayloadObj['ItemCode'] || rawPayloadObj['item_code'] || rawPayloadObj['partcode']))
    ? String(rawPayloadObj['Part Code'] || rawPayloadObj['part_code'] || rawPayloadObj['PartCode'] || rawPayloadObj['ItemCode'] || rawPayloadObj['item_code'] || rawPayloadObj['partcode']).trim()
    : '';

  const normItemCode = itemCode.toUpperCase();
  const normPartCode = partCode.toUpperCase();
  const normPayloadCode = payloadPartCode.toUpperCase();

  const directGrouping = (row.grouping && String(row.grouping).trim()) || (row.part_grouping && String(row.part_grouping).trim()) || '';

  // Priority: direct grouping column in part_replacement, then lookup from part_grouping table
  const lookupGroup =
    directGrouping ||
    (lookupMap && normItemCode && lookupMap.get(normItemCode)) ||
    (lookupMap && normPartCode && lookupMap.get(normPartCode)) ||
    (lookupMap && normPayloadCode && lookupMap.get(normPayloadCode)) ||
    (rawPayloadObj && (rawPayloadObj['Grouping'] || rawPayloadObj['grouping'] || rawPayloadObj['Part Grouping'] || rawPayloadObj['part_grouping'] || rawPayloadObj['Part Group'] || rawPayloadObj['grouping name'] || rawPayloadObj['grouping_name'])) ||
    (row.description && String(row.description).trim()) ||
    itemCode ||
    'Other Components';

  const finalGrouping = String(lookupGroup).trim() || 'Other Components';

  return {
    ...row,
    grouping: finalGrouping,
    part_grouping: finalGrouping,
  };
}

/**
 * Loads QA lookup dictionary from `part_grouping` table.
 * Maps partcode (normalized uppercase) -> grouping name.
 */
async function getPartGroupingLookupMap() {
  const lookupMap = new Map();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('part_grouping')
        .select('*');

      if (!error && data && Array.isArray(data)) {
        for (const row of data) {
          const groupName = getGroupingNameFromRow(row);
          const partCode = getPartCodeFromRow(row);

          if (groupName && partCode) {
            const normCode = partCode.toUpperCase();
            if (!lookupMap.has(normCode)) {
              lookupMap.set(normCode, groupName);
            }
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Supabase part_grouping table lookup notice:', e.message);
    }
  }

  if (pool) {
    try {
      const [sqlRows] = await pool.query(`SELECT * FROM part_grouping`);
      if (sqlRows && Array.isArray(sqlRows)) {
        for (const row of sqlRows) {
          const groupName = getGroupingNameFromRow(row);
          const partCode = getPartCodeFromRow(row);

          if (groupName && partCode) {
            const normCode = partCode.toUpperCase();
            if (!lookupMap.has(normCode)) {
              lookupMap.set(normCode, groupName);
            }
          }
        }
      }
    } catch (e) {
      // Ignore if table not present in pool
    }
  }

  return lookupMap;
}

/**
 * Performs a QA lookup update from `part_grouping` table into `part_replacement` table.
 * Takes item_code from part_replacement and compares with partcode from part_grouping.
 * On match, pastes the respective grouping name into part_replacement.part_grouping.
 */
async function syncPartGroupingLookup() {
  let updatedCount = 0;
  const lookupMap = await getPartGroupingLookupMap();

  if (lookupMap.size === 0) {
    return { success: true, updatedCount: 0, mappingsCount: 0, message: 'part_grouping table is empty or has no mappings' };
  }

  if (supabase) {
    try {
      // 1. Fast batch update per distinct partcode in lookupMap
      for (const [normCode, groupName] of lookupMap.entries()) {
        try {
          const { data, error } = await supabase
            .from('part_replacement')
            .update({ part_grouping: groupName, grouping: groupName })
            .ilike('item_code', normCode)
            .select('id');
          if (!error && data) {
            updatedCount += data.length;
          }
        } catch (err) {
          // ignore single entry error
        }
      }

      // 2. Comprehensive check for padded/whitespace-trimmed item_codes across all pages
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from('part_replacement')
          .select('id, item_code, part_grouping')
          .range(from, from + PAGE_SIZE - 1);

        if (error || !batch || batch.length === 0) {
          break;
        }

        for (const item of batch) {
          const rawCode = (item.item_code || '').trim().toUpperCase();
          if (rawCode && lookupMap.has(rawCode)) {
            const targetGroup = lookupMap.get(rawCode);
            if (item.part_grouping !== targetGroup || item.grouping !== targetGroup) {
              await supabase
                .from('part_replacement')
                .update({ part_grouping: targetGroup, grouping: targetGroup })
                .eq('id', item.id);
              updatedCount++;
            }
          }
        }

        if (batch.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      }
    } catch (e) {
      console.warn('⚠️ Supabase syncPartGroupingLookup notice:', e.message);
    }
  }

  if (pool) {
    try {
      const [res] = await pool.query(
        `UPDATE part_replacement pr
         JOIN part_grouping pg ON (
           UPPER(TRIM(pr.item_code)) = UPPER(TRIM(COALESCE(pg.partcode, pg.part_code, pg.item_code, '')))
         )
         SET pr.part_grouping = COALESCE(pg.groupingname, pg.grouping_name, pg.part_grouping, pg.grouping),
             pr.grouping = COALESCE(pg.groupingname, pg.grouping_name, pg.part_grouping, pg.grouping)
         WHERE pr.part_grouping IS NULL OR pr.part_grouping = '' OR pr.part_grouping != COALESCE(pg.groupingname, pg.grouping_name, pg.part_grouping, pg.grouping)`
      );
      if (res && res.affectedRows) {
        updatedCount += res.affectedRows;
      }
    } catch (e) {
      try {
        const [res2] = await pool.query(
          `UPDATE part_replacement
           SET part_grouping = COALESCE(pg.groupingname, pg.grouping_name, pg.part_grouping, pg.grouping),
               grouping = COALESCE(pg.groupingname, pg.grouping_name, pg.part_grouping, pg.grouping)
           FROM part_grouping pg
           WHERE UPPER(TRIM(part_replacement.item_code)) = UPPER(TRIM(COALESCE(pg.partcode, pg.part_code, pg.item_code, '')))`
        );
        if (res2 && res2.affectedRows) {
          updatedCount += res2.affectedRows;
        }
      } catch (err2) {
        console.warn('⚠️ SQL pool syncPartGroupingLookup error:', e.message);
      }
    }
  }

  return { success: true, updatedCount, mappingsCount: lookupMap.size };
}

/**
 * Returns part replacements aggregated by part_grouping / part name for FL and TL.
 * Matches part_replacement.item_code with part_grouping.partcode and displays the grouping name.
 */
async function getPartGroupingCounts({ date = '', productCategory = '', subCategory = '' } = {}) {
  let activeDate = date;
  const latestDate = await getLatestDate();
  if (date === 'latest') {
    activeDate = latestDate || '';
  }

  const lookupMap = await getPartGroupingLookupMap();

  // Auto-sync into part_replacement table in background whenever showcase is viewed
  if (lookupMap.size > 0) {
    syncPartGroupingLookup().catch(() => {});
  }

  let rows = [];
  if (supabase) {
    try {
      let q = supabase.from('part_replacement').select('grouping, part_grouping, description, item_code, sub_category, model, ageing_days, approved_qty, raw_payload');
      q = applySupabaseFilters(q, { search: '', ageingMin: null, ageingMax: null, productCategory, subCategory, date: activeDate });
      const { data, error } = await q;
      if (!error && data) {
        rows = data;
      }
    } catch (e) {
      console.warn('⚠️ Supabase partGrouping notice:', e.message);
    }
  }


  if (rows.length === 0 && pool) {
    try {
      const { whereClause, params } = buildWhereClause({ search: '', ageingMin: null, ageingMax: null, productCategory, subCategory, date: activeDate });
      const [sqlRows] = await pool.query(
        `SELECT grouping, part_grouping, description, item_code, sub_category, model, ageing_days, approved_qty, raw_payload
         FROM part_replacement
         WHERE ${whereClause}`,
        params
      );
      if (sqlRows) rows = sqlRows;
    } catch (e) {
      try {
        const { whereClause, params } = buildWhereClause({ search: '', ageingMin: null, ageingMax: null, productCategory, subCategory, date: activeDate });
        const [sqlRows] = await pool.query(
          `SELECT description, item_code, sub_category, model, ageing_days, approved_qty, raw_payload
           FROM part_replacement
           WHERE ${whereClause}`,
          params
        );
        if (sqlRows) rows = sqlRows;
      } catch (err) {
        console.warn('⚠️ SQL pool partGrouping error:', err.message);
      }
    }
  }

  const flMap = new Map();
  const tlMap = new Map();
  let flTotal = 0;
  let tlTotal = 0;

  for (const rawRow of rows) {
    const row = enrichRowWithLookup(rawRow, lookupMap);
    const subCat = (row.sub_category || '').toUpperCase().trim();
    const model = (row.model || '').toUpperCase().trim();
    const isTl = subCat === 'TL' || model.startsWith('TL');

    let parsedPayload = null;
    if (row.raw_payload) {
      if (typeof row.raw_payload === 'object') parsedPayload = row.raw_payload;
      else {
        try { parsedPayload = JSON.parse(row.raw_payload); } catch (e) {}
      }
    }

    const partName = String(row.grouping || row.part_grouping || 'Other Components').trim();
    const groupKey = partName.toUpperCase();

    const targetMap = isTl ? tlMap : flMap;
    if (isTl) tlTotal += 1; else flTotal += 1;

    if (!targetMap.has(groupKey)) {
      targetMap.set(groupKey, {
        partName,
        count: 0,
        ageing: {
          installFailure: 0,
          months0_3: 0,
          year1: 0,
          year2: 0,
          year3: 0,
          year4: 0,
          moreThan4: 0,
        },
      });
    }

    const entry = targetMap.get(groupKey);
    entry.count += 1;

    const days = row.ageing_days;
    if (days === 0 || days === '0') {
      entry.ageing.installFailure += 1;
    } else if (days === null || days === undefined || (days >= 1 && days <= 90)) {
      entry.ageing.months0_3 += 1;
    } else if (days >= 91 && days <= 365) {
      entry.ageing.year1 += 1;
    } else if (days >= 366 && days <= 730) {
      entry.ageing.year2 += 1;
    } else if (days >= 731 && days <= 1095) {
      entry.ageing.year3 += 1;
    } else if (days >= 1096 && days <= 1460) {
      entry.ageing.year4 += 1;
    } else if (days > 1460) {
      entry.ageing.moreThan4 += 1;
    }
  }

  const flPartGroups = Array.from(flMap.values())
    .map((item) => ({
      ...item,
      percentage: flTotal > 0 ? ((item.count / flTotal) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.count - a.count);

  const tlPartGroups = Array.from(tlMap.values())
    .map((item) => ({
      ...item,
      percentage: tlTotal > 0 ? ((item.count / tlTotal) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.count - a.count);

  return {
    flPartGroups,
    tlPartGroups,
    flTotal,
    tlTotal,
    activeDate,
    latestDate,
    lookupCount: lookupMap.size,
  };
}

module.exports = {
  getSummaryCounts,
  getDetails,
  getDetailsForExport,
  updateComment,
  getLatestDate,
  getPartGroupingCounts,
  getPartGroupingLookupMap,
  syncPartGroupingLookup,
  enrichRowWithLookup,
};



