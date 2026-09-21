// ============================================================
// Upload Service (frontend)
// ------------------------------------------------------------
// Wraps POST /api/upload as a multipart/form-data request.
// ============================================================

import api from './api';

/**
 * Validates and inspects Product Replacement, Part Replacement, and/or Part Grouping files without inserting into database.
 * Returns cell errors, exact coordinates, preview rows, and session tokens.
 */
export function validateExcelFiles(files, onProgress) {
  const formData = new FormData();
  if (files.productReplacement) formData.append('productReplacement', files.productReplacement);
  if (files.partReplacement) formData.append('partReplacement', files.partReplacement);
  if (files.partGrouping) formData.append('partGrouping', files.partGrouping);

  return api.post('/upload?validateOnly=true', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
}

/**
 * Commits previously validated Excel session tokens into MySQL/Supabase.
 */
export function commitExcelUpload(sessionTokens) {
  return api.post('/upload/commit', { sessionTokens });
}

/**
 * Direct full upload and save to database in one step.
 */
export function uploadExcelFiles(files, onProgress) {
  const formData = new FormData();
  if (files.productReplacement) formData.append('productReplacement', files.productReplacement);
  if (files.partReplacement) formData.append('partReplacement', files.partReplacement);
  if (files.partGrouping) formData.append('partGrouping', files.partGrouping);

  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
}

