// ============================================================
// Upload Routes
// ============================================================

const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { uploadFiles } = require('../controllers/uploadController');

// POST /api/upload
// Accepts up to one file per field: productReplacement, partReplacement
router.post(
  '/upload',
  upload.fields([
    { name: 'productReplacement', maxCount: 1 },
    { name: 'partReplacement', maxCount: 1 },
  ]),
  uploadFiles
);

module.exports = router;
