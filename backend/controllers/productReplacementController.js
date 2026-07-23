// ============================================================
// Product Replacement Controller
// ------------------------------------------------------------
// Handles GET /api/product/dashboard and GET /api/product/details.
// Always reads from MySQL via productReplacementService — never
// touches Excel. Thin layer: validates query params, delegates to
// the service, and formats the HTTP response.
// ============================================================

const productReplacementService = require('../services/productReplacementService');
const { success, error } = require('../utils/responseHandler');

/**
 * GET /api/product/dashboard
 * Returns summary card counts for each ageing bucket.
 */
async function getDashboard(req, res, next) {
  try {
    const { typeOfDamage = '' } = req.query;
    const summary = await productReplacementService.getDashboardSummary({ typeOfDamage });
    return success(res, summary, 'Dashboard summary fetched successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/product/details
 * Query params:
 *   ageingCategory  - optional key (e.g. '0-3-months') to scope results to one card
 *   typeOfDamage    - optional damage type ('Functional' | 'Transit' | 'ALL')
 *   page            - page number (default 1)
 *   pageSize        - rows per page (default 25)
 *   search          - free-text search across complaint number/model/serial
 *   sortBy          - column to sort by
 *   sortDir         - ASC | DESC
 *   export          - if 'csv', returns ALL matching rows (no pagination) for client-side CSV export
 */
async function getDetails(req, res, next) {
  try {
    const {
      ageingCategory = null,
      typeOfDamage = '',
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'doc',
      sortDir = 'DESC',
      export: exportFlag,
    } = req.query;

    if (exportFlag === 'csv') {
      const rows = await productReplacementService.getDetailsForExport({ ageingCategory, search, typeOfDamage });
      return success(res, { rows }, 'Export data fetched successfully');
    }

    const result = await productReplacementService.getDashboardDetails({
      ageingCategory,
      typeOfDamage,
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
