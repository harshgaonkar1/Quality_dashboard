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
    const { typeOfDamage = '', productCategory = '', date = '' } = req.query;
    const summary = await productReplacementService.getDashboardSummary({ typeOfDamage, productCategory, date });
    return success(res, summary, 'Dashboard summary fetched successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/product/details
 * Query params:
 *   ageingCategory   - optional key (e.g. '0-3-months') to scope results to one card
 *   typeOfDamage     - optional damage type ('Functional' | 'Transit' | 'ALL')
 *   productCategory  - optional model category ('TL' | 'FL' | 'ALL')
 *   date             - optional exact date filter (zmac_date / doc)
 *   page             - page number (default 1)
 *   pageSize         - rows per page (default 25)
 *   search           - free-text search across complaint number/model/serial
 *   sortBy           - column to sort by
 *   sortDir          - ASC | DESC
 *   export           - if 'csv', returns ALL matching rows (no pagination) for client-side CSV export
 */
async function getDetails(req, res, next) {
  try {
    const {
      ageingCategory = null,
      typeOfDamage = '',
      productCategory = '',
      date = '',
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'doc',
      sortDir = 'DESC',
      export: exportFlag,
    } = req.query;

    if (exportFlag === 'csv') {
      const rows = await productReplacementService.getDetailsForExport({ ageingCategory, search, typeOfDamage, productCategory, date });
      return success(res, { rows }, 'Export data fetched successfully');
    }

    const result = await productReplacementService.getDashboardDetails({
      ageingCategory,
      typeOfDamage,
      productCategory,
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
 * POST /api/product/comment
 * Expects JSON body: { serialNumber: string, comment: string }
 */
async function saveComment(req, res, next) {
  try {
    const { serialNumber, comment } = req.body;
    if (!serialNumber) {
      return error(res, 'Serial number is required', 400);
    }
    const updated = await productReplacementService.updateComment(serialNumber, comment ?? '');
    return success(res, { updated }, 'Comment saved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/product/action-plan
 * Expects JSON body: { serialNumber: string, complaintNumber: string, actionDone: string, responsiblePerson: string, initiatorName: string }
 */
async function saveActionPlan(req, res, next) {
  try {
    const { serialNumber, complaintNumber, actionDone, responsiblePerson, initiatorName } = req.body;
    if (!serialNumber && !complaintNumber) {
      return error(res, 'Serial number or complaint number is required', 400);
    }
    const updated = await productReplacementService.updateActionPlan(
      serialNumber,
      { actionDone, responsiblePerson, initiatorName },
      complaintNumber
    );
    return success(res, { updated }, 'Action plan saved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getDetails, saveComment, saveActionPlan };
