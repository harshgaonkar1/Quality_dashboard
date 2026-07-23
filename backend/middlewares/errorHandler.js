// ============================================================
// Global Error Handler
// ------------------------------------------------------------
// Catches errors thrown/forwarded from any route (including
// Multer errors) and returns a consistent JSON error response.
// Must be registered LAST in server.js, after all routes.
// ============================================================

const multer = require('multer');

function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
}

// 404 handler for unmatched routes
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
