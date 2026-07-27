// ============================================================
// Part Replacement Service
// ------------------------------------------------------------
// Sits between the controller and the model. Applies the ageing
// category labels/formatting for Part Replacement.
// ============================================================

const partReplacementModel = require('../models/partReplacementModel');
const { getAgeingCategory, getAgeingRangeByKey, AGEING_CATEGORIES } = require('../utils/ageingCategory');

/**
 * Builds the summary card payload: one entry per ageing bucket,
 * each with its label and count for Part Replacement.
 */
async function getDashboardSummary({ productCategory = '', subCategory = '' } = {}) {
  const counts = await partReplacementModel.getSummaryCounts({ productCategory, subCategory });

  const cards = [
    {
      key: '0-3-months',
      label: '0-3 Months',
      count: Number(counts.bucket_0_3_months) || 0,
      tlCount: Number(counts.bucket_0_3_months_tl) || 0,
      flCount: Number(counts.bucket_0_3_months_fl) || 0,
    },
    {
      key: '1-year',
      label: '1 Year',
      count: Number(counts.bucket_1_year) || 0,
      tlCount: Number(counts.bucket_1_year_tl) || 0,
      flCount: Number(counts.bucket_1_year_fl) || 0,
    },
    {
      key: '2-year',
      label: '2 Year',
      count: Number(counts.bucket_2_year) || 0,
      tlCount: Number(counts.bucket_2_year_tl) || 0,
      flCount: Number(counts.bucket_2_year_fl) || 0,
    },
    {
      key: '3-year',
      label: '3 Year',
      count: Number(counts.bucket_3_year) || 0,
      tlCount: Number(counts.bucket_3_year_tl) || 0,
      flCount: Number(counts.bucket_3_year_fl) || 0,
    },
    {
      key: '4-year',
      label: '4 Year',
      count: Number(counts.bucket_4_year) || 0,
      tlCount: Number(counts.bucket_4_year_tl) || 0,
      flCount: Number(counts.bucket_4_year_fl) || 0,
    },
    {
      key: 'more-than-4-years',
      label: 'More than 4 Years',
      count: Number(counts.bucket_more_than_4_years) || 0,
      tlCount: Number(counts.bucket_more_than_4_years_tl) || 0,
      flCount: Number(counts.bucket_more_than_4_years_fl) || 0,
    },
  ];

  const total = cards.reduce((sum, card) => sum + card.count, 0);
  const tlCount = Number(counts.tl_count) || 0;
  const flCount = Number(counts.fl_count) || 0;

  return { total, tlCount, flCount, cards };
}

/**
 * Fetches the paginated detail rows for a given ageing category (optional),
 * enriching each row with its human-readable ageing category label.
 */
async function getDashboardDetails({ ageingCategory, page, pageSize, search, sortBy, sortDir, productCategory, subCategory }) {
  let ageingMin = null;
  let ageingMax = null;

  if (ageingCategory) {
    const range = getAgeingRangeByKey(ageingCategory);
    if (!range) {
      const err = new Error(`Invalid ageing category: ${ageingCategory}`);
      err.statusCode = 400;
      throw err;
    }
    ageingMin = range.min;
    ageingMax = range.max;
  }

  const result = await partReplacementModel.getDetails({
    page, pageSize, search, sortBy, sortDir, ageingMin, ageingMax, productCategory, subCategory,
  });

  const enrichedRows = result.rows.map((row) => ({
    ...row,
    ageing_category: getAgeingCategory(row.ageing_days)?.label || 'Unknown',
  }));

  return { ...result, rows: enrichedRows };
}

/**
 * Fetches ALL matching rows (no pagination) for CSV export, with ageing labels attached.
 */
async function getDetailsForExport({ ageingCategory, search, productCategory, subCategory }) {
  let ageingMin = null;
  let ageingMax = null;

  if (ageingCategory) {
    const range = getAgeingRangeByKey(ageingCategory);
    if (range) {
      ageingMin = range.min;
      ageingMax = range.max;
    }
  }

  const rows = await partReplacementModel.getDetailsForExport({ search, ageingMin, ageingMax, productCategory, subCategory });
  return rows.map((row) => ({
    ...row,
    ageing_category: getAgeingCategory(row.ageing_days)?.label || 'Unknown',
  }));
}

module.exports = { getDashboardSummary, getDashboardDetails, getDetailsForExport, AGEING_CATEGORIES };
