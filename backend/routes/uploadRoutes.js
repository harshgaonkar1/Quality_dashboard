// ============================================================
// Upload Routes
// ============================================================

const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { uploadFiles, commitUpload } = require('../controllers/uploadController');

// POST /api/upload
// Accepts up to one file per field: productReplacement, partReplacement, partGrouping
// Optional query/body: validateOnly=true (dry-run inspection)
router.post(
  '/upload',
  upload.fields([
    { name: 'productReplacement', maxCount: 1 },
    { name: 'partReplacement', maxCount: 1 },
    { name: 'partGrouping', maxCount: 1 },
  ]),
  uploadFiles
);

// POST /api/upload/commit
// Commits previously validated sessions to database
router.post('/upload/commit', express.json(), commitUpload);

module.exports = router;
