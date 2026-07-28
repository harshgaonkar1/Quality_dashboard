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
    const { productCategory = '', subCategory = '', date = '' } = req.query;
    const summary = await partReplacementService.getDashboardSummary({ productCategory, subCategory, date });
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
 *   date             - optional exact date filter (spu_created_date / doc)
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
      date = '',
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'doc',
      sortDir = 'DESC',
      export: exportFlag,
    } = req.query;

    if (exportFlag === 'csv') {
      const rows = await partReplacementService.getDetailsForExport({ ageingCategory, search, productCategory, subCategory, date });
      return success(res, { rows }, 'Export data fetched successfully');
    }

    const result = await partReplacementService.getDashboardDetails({
      ageingCategory,
      productCategory,
      subCategory,
      date,
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

/**
 * POST /api/part/comment
 * Expects JSON body: { serialNumber: string, comment: string }
 */
async function saveComment(req, res, next) {
  try {
    const { serialNumber, comment } = req.body;
    if (!serialNumber) {
      return error(res, 'Serial number is required', 400);
    }
    const updated = await partReplacementService.updateComment(serialNumber, comment ?? '');
    return success(res, { updated }, 'Comment saved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getDetails, saveComment };
