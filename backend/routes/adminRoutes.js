// ============================================================
// Admin Routes
// ------------------------------------------------------------
// Password verification endpoint for Admin Mode access.
// ============================================================

const express = require('express');
const router = express.Router();
const { success, error } = require('../utils/responseHandler');

// POST /api/admin/verify-password
router.post('/verify-password', (req, res) => {
  const { password } = req.body;
  const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD || 'ImHarshTheAllMighty';

  if (!password) {
    return error(res, 'Password is required', 400);
  }

  if (password === expectedPassword) {
    return success(res, { isAdmin: true }, 'Admin password verified successfully');
  }

  return error(res, 'Incorrect admin password', 401);
});

module.exports = router;
