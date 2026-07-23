// ============================================================
// Product Replacement Service (frontend)
// ------------------------------------------------------------
// Wraps the /api/product/* endpoints. Every call here reads from
// MySQL on the backend -- the frontend never talks to Excel.
// ============================================================

import api from './api';

/** Fetches the ageing-bucket summary cards. */
export function fetchDashboardSummary(params = {}) {
  return api.get('/product/dashboard', { params });
}

/**
 * Fetches paginated, filterable, sortable detail rows.
 * @param {object} params { ageingCategory, page, pageSize, search, sortBy, sortDir }
 */
export function fetchDashboardDetails(params) {
  return api.get('/product/details', { params });
}

/**
 * Fetches ALL matching rows (no pagination) for CSV export.
 * @param {object} params { ageingCategory, search }
 */
export function fetchDetailsForExport(params) {
  return api.get('/product/details', { params: { ...params, export: 'csv' } });
}
