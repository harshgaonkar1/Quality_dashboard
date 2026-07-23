// ============================================================
// Upload Service (frontend)
// ------------------------------------------------------------
// Wraps POST /api/upload as a multipart/form-data request.
// ============================================================

import api from './api';

/**
 * Uploads Product Replacement and/or Part Replacement Excel files.
 * @param {{ productReplacement?: File, partReplacement?: File }} files
 * @param {(percent:number)=>void} onProgress optional progress callback
 */
export function uploadExcelFiles(files, onProgress) {
  const formData = new FormData();
  if (files.productReplacement) formData.append('productReplacement', files.productReplacement);
  if (files.partReplacement) formData.append('partReplacement', files.partReplacement);

  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
}
