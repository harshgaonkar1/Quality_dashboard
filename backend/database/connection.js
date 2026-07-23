// ============================================================
// MySQL Connection Pool & Auto-Database Initialization
// ------------------------------------------------------------
// Uses mysql2/promise for async/await support.
// Automatically checks for database presence at startup and
// creates 'dashboard_db' + schema tables if missing.
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'dashboard_db';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const CREATE_PRODUCT_REPLACEMENT_TABLE = `
CREATE TABLE IF NOT EXISTS product_replacement (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_number    VARCHAR(64)  NOT NULL,
  model               VARCHAR(128) NULL,
  branch              VARCHAR(128) NULL,
  mat_cat             VARCHAR(64)  NULL,
  machine_status      VARCHAR(64)  NULL,
  serial_number       VARCHAR(128) NULL,
  doi                 DATE NULL,
  doc                 DATE NULL,
  ageing_days         INT NULL,
  fd_zbrn_status      VARCHAR(64) NULL,
  type_of_damage      VARCHAR(64) NULL,
  raw_payload         JSON NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_product_complaint_number UNIQUE (complaint_number),
  INDEX idx_product_fd_zbrn_status (fd_zbrn_status),
  INDEX idx_product_type_of_damage (type_of_damage),
  INDEX idx_product_ageing_days (ageing_days),
  INDEX idx_product_doc (doc)
) ENGINE=InnoDB;
`;

const CREATE_PART_REPLACEMENT_TABLE = `
CREATE TABLE IF NOT EXISTS part_replacement (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_number    VARCHAR(64)  NOT NULL,
  model               VARCHAR(128) NULL,
  branch              VARCHAR(128) NULL,
  mat_cat             VARCHAR(64)  NULL,
  machine_status      VARCHAR(64)  NULL,
  serial_number       VARCHAR(128) NULL,
  part_number         VARCHAR(128) NULL,
  part_name           VARCHAR(128) NULL,
  doi                 DATE NULL,
  doc                 DATE NULL,
  ageing_days         INT NULL,
  fd_zbrn_status      VARCHAR(64) NULL,
  type_of_damage      VARCHAR(64) NULL,
  raw_payload         JSON NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_part_complaint_number UNIQUE (complaint_number),
  INDEX idx_part_fd_zbrn_status (fd_zbrn_status),
  INDEX idx_part_type_of_damage (type_of_damage),
  INDEX idx_part_ageing_days (ageing_days),
  INDEX idx_part_doc (doc)
) ENGINE=InnoDB;
`;

const CREATE_UPLOAD_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS upload_logs (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  upload_type      ENUM('PRODUCT_REPLACEMENT', 'PART_REPLACEMENT') NOT NULL,
  file_name        VARCHAR(255) NOT NULL,
  total_rows       INT DEFAULT 0,
  inserted_rows    INT DEFAULT 0,
  skipped_rows     INT DEFAULT 0,
  duplicate_rows   INT DEFAULT 0,
  error_rows       INT DEFAULT 0,
  status           ENUM('SUCCESS', 'PARTIAL', 'FAILED') DEFAULT 'SUCCESS',
  error_details    JSON NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_upload_logs_type (upload_type)
) ENGINE=InnoDB;
`;

let initPromise = null;

/**
 * Safely adds a column to an existing table if it does not exist yet.
 */
async function addColumnIfMissing(conn, tableName, columnName, columnDef) {
  try {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, tableName, columnName]
    );
    if (cols.length === 0) {
      await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`);
      console.log(`ℹ️ Auto-migrated table '${tableName}': added column '${columnName}'`);
    }
  } catch (e) {
    console.warn(`Could not add column ${columnName} to ${tableName}:`, e.message);
  }
}

/**
 * Connects to MySQL root/server level, creates the database if missing,
 * selects it, and executes table creation queries & column migrations.
 */
async function ensureDatabaseAndSchema() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const tempConn = await mysql.createConnection(dbConfig);
    try {
      await tempConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await tempConn.query(`USE \`${dbName}\`;`);
      await tempConn.query(CREATE_PRODUCT_REPLACEMENT_TABLE);
      await tempConn.query(CREATE_PART_REPLACEMENT_TABLE);
      await tempConn.query(CREATE_UPLOAD_LOGS_TABLE);

      // Auto-migrate missing columns for existing tables
      await addColumnIfMissing(tempConn, 'product_replacement', 'branch', 'VARCHAR(128) NULL AFTER model');
      await addColumnIfMissing(tempConn, 'product_replacement', 'mat_cat', 'VARCHAR(64) NULL AFTER branch');
      await addColumnIfMissing(tempConn, 'product_replacement', 'machine_status', 'VARCHAR(64) NULL AFTER mat_cat');

      await addColumnIfMissing(tempConn, 'part_replacement', 'branch', 'VARCHAR(128) NULL AFTER model');
      await addColumnIfMissing(tempConn, 'part_replacement', 'mat_cat', 'VARCHAR(64) NULL AFTER branch');
      await addColumnIfMissing(tempConn, 'part_replacement', 'machine_status', 'VARCHAR(64) NULL AFTER mat_cat');
    } catch (err) {
      initPromise = null;
      console.error(`⚠️ Error ensuring database '${dbName}' exists:`, err.message);
      throw err;
    } finally {
      await tempConn.end();
    }
  })();

  return initPromise;
}

const pool = mysql.createPool({
  ...dbConfig,
  database: dbName,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  dateStrings: true,
});

// Trigger database check immediately upon loading module
ensureDatabaseAndSchema().catch(() => {});

// Intercept pool.query to ensure database exists before running queries
const originalQuery = pool.query.bind(pool);
pool.query = async function (...args) {
  try {
    await ensureDatabaseAndSchema();
    return await originalQuery(...args);
  } catch (err) {
    if (err.code === 'ER_BAD_DB_ERROR' || err.errno === 1049) {
      initPromise = null;
      await ensureDatabaseAndSchema();
      return await originalQuery(...args);
    }
    throw err;
  }
};

// Intercept pool.getConnection to ensure database exists before acquiring connections
const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async function () {
  try {
    await ensureDatabaseAndSchema();
    return await originalGetConnection();
  } catch (err) {
    if (err.code === 'ER_BAD_DB_ERROR' || err.errno === 1049) {
      initPromise = null;
      await ensureDatabaseAndSchema();
      return await originalGetConnection();
    }
    throw err;
  }
};

/**
 * Verifies that the database is reachable and initialized.
 */
async function testConnection() {
  try {
    await ensureDatabaseAndSchema();
    const connection = await pool.getConnection();
    console.log(`✅ MySQL connected successfully (Database: '${dbName}')`);
    connection.release();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection, ensureDatabaseAndSchema };
