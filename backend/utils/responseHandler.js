// ============================================================
// Standardized API Response Helpers
// ------------------------------------------------------------
// Ensures every endpoint returns a consistent JSON envelope,
// making the frontend's Axios error handling predictable.
// ============================================================

function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function error(res, message = 'Something went wrong', statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
}

module.exports = { success, error };
