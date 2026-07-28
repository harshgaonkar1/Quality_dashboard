// ============================================================
// Server Entrypoint
// ------------------------------------------------------------
// Wires together Express, CORS, JSON body parsing, routes, and
// the global error handler. Verifies the MySQL connection before
// accepting traffic.
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { testConnection } = require('./database/connection');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const uploadRoutes = require('./routes/uploadRoutes');
const productReplacementRoutes = require('./routes/productReplacementRoutes');
const partReplacementRoutes = require('./routes/partReplacementRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Global Middlewares ----
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Health Check ----
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
});

// ---- Routes ----
app.use('/api', uploadRoutes);
app.use('/api/product', productReplacementRoutes);
app.use('/api/part', partReplacementRoutes);
app.use('/api/admin', adminRoutes);

// ---- 404 + Error Handling (must be last) ----
app.use(notFoundHandler);
app.use(errorHandler);

// ---- Start Server ----
(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();

module.exports = app;
