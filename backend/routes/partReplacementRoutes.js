// ============================================================
// Part Replacement Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { getDashboard, getDetails, saveComment } = require('../controllers/partReplacementController');

// GET /api/part/dashboard - summary cards
router.get('/dashboard', getDashboard);

// GET /api/part/details - paginated / filtered / exportable detail rows
router.get('/details', getDetails);

// POST /api/part/comment - save admin comment
router.post('/comment', saveComment);

module.exports = router;
