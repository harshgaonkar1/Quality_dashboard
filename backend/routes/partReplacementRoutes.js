// ============================================================
// Part Replacement Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { getDashboard, getDetails, saveComment, getGrouping, syncGrouping } = require('../controllers/partReplacementController');
const { verifyAdmin } = require('../middleware/authMiddleware');

// GET /api/part/dashboard - summary cards
router.get('/dashboard', getDashboard);

// GET /api/part/grouping - summary of part replacements grouped by part name for FL & TL
router.get('/grouping', getGrouping);

// POST /api/part/sync-grouping - triggers QA lookup sync from part_grouping into part_replacement
router.post('/sync-grouping', syncGrouping);

// GET /api/part/details - paginated / filtered / exportable detail rows
router.get('/details', getDetails);

// POST /api/part/comment - save admin comment (requires admin authentication)
router.post('/comment', verifyAdmin, saveComment);

module.exports = router;

