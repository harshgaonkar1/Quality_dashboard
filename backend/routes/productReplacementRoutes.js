// ============================================================
// Product Replacement Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { getDashboard, getDetails } = require('../controllers/productReplacementController');

// GET /api/product/dashboard - summary cards
router.get('/dashboard', getDashboard);

// GET /api/product/details - paginated / filtered / exportable detail rows
router.get('/details', getDetails);

module.exports = router;
