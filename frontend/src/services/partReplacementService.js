// ============================================================
// Part Replacement Service (frontend)
// ------------------------------------------------------------
// Wraps the /api/part/* endpoints. Reads from MySQL on backend.
// ============================================================

import api from './api';

/** Fetches the ageing-bucket summary cards for Part Replacement. */
export function fetchDashboardSummary(params = {}) {
  return api.get('/part/dashboard', { params });
}

/**
 * Fetches paginated, filterable, sortable detail rows for Part Replacement.
 * @param {object} params { ageingCategory, subCategory, page, pageSize, search, sortBy, sortDir }
 */
export function fetchDashboardDetails(params) {
  return api.get('/part/details', { params });
}

/**
 * Fetches ALL matching rows (no pagination) for CSV export.
 * @param {object} params { ageingCategory, subCategory, search }
 */
export function fetchDetailsForExport(params) {
  return api.get('/part/details', { params: { ...params, export: 'csv' } });
}
