// ============================================================
// Axios Instance
// ------------------------------------------------------------
// Single configured Axios client used by every service module.
// Centralizes the base URL and response/error interceptors so
// individual services don't repeat boilerplate.
// ============================================================

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Unwraps the { success, message, data } envelope and normalizes errors
// into a plain Error with a readable message, so calling code can just
// `try { const data = await someService(); } catch (err) { err.message }`.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
