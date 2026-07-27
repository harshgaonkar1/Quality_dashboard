// ============================================================
// Part Replacement Controller
// ------------------------------------------------------------
// Handles GET /api/part/dashboard and GET /api/part/details.
// Always reads from MySQL via partReplacementService.
// ============================================================

const partReplacementService = require('../services/partReplacementService');
const { success, error } = require('../utils/responseHandler');

/**
 * GET /api/part/dashboard
 * Returns summary card counts for each ageing bucket for Part Replacement.
 */
async function getDashboard(req, res, next) {
  try {
    const { productCategory = '', subCategory = '' } = req.query;
    const summary = await partReplacementService.getDashboardSummary({ productCategory, subCategory });
    return success(res, summary, 'Part replacement summary fetched successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/part/details
 * Query params:
 *   ageingCategory   - optional key (e.g. '0-3-months')
 *   subCategory      - optional sub-category ('TL' | 'FL' | 'ALL')
 *   page             - page number
 *   pageSize         - rows per page
 *   search           - free-text search
 *   sortBy           - column to sort by
 *   sortDir          - ASC | DESC
 *   export           - if 'csv', returns ALL matching rows
 */
async function getDetails(req, res, next) {
  try {
    const {
      ageingCategory = null,
      productCategory = '',
      subCategory = '',
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'doc',
      sortDir = 'DESC',
      export: exportFlag,
    } = req.query;

    if (exportFlag === 'csv') {
      const rows = await partReplacementService.getDetailsForExport({ ageingCategory, search, productCategory, subCategory });
      return success(res, { rows }, 'Export data fetched successfully');
    }

    const result = await partReplacementService.getDashboardDetails({
      ageingCategory,
      productCategory,
      subCategory,
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      sortBy,
      sortDir,
    });

    return success(res, result, 'Details fetched successfully');
  } catch (err) {
    if (err.statusCode === 400) return error(res, err.message, 400);
    next(err);
  }
}

module.exports = { getDashboard, getDetails };
