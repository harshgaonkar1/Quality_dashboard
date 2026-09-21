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

// Attaches admin password header if user is authenticated in Admin mode
api.interceptors.request.use((config) => {
  const adminPassword = localStorage.getItem('admin_password');
  if (adminPassword) {
    config.headers['x-admin-password'] = adminPassword;
  }
  return config;
});

// Unwraps the { success, message, data } envelope and normalizes errors
// into an Error with readable message + attached error details and cellErrors.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';
    const customError = new Error(message);
    customError.response = error.response;
    customError.data = error.response?.data;
    customError.cellErrors = error.response?.data?.cellErrors || error.response?.data?.data?.cellErrors || null;
    customError.details = error.response?.data?.details || null;
    return Promise.reject(customError);
  }
);

export default api;
