// ============================================================
// Admin Authorization Middleware
// ------------------------------------------------------------
// Protects backend mutation routes (like saving remarks/comments).
// Checks 'x-admin-password' header against the configured password.
// ============================================================

const { error } = require('../utils/responseHandler');

function verifyAdmin(req, res, next) {
  const password = req.headers['x-admin-password'] || req.body?.adminPassword;
  const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD || 'ImHarshTheAllMighty';

  if (!password || password !== expectedPassword) {
    return error(res, 'Unauthorized: Admin authentication required to edit remarks', 401);
  }

  next();
}

module.exports = { verifyAdmin };
