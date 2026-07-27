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
  complaint_number    VARCHAR(64)  NULL,
  zmac_date           DATE NULL,
  zmac_status         VARCHAR(64)  NULL,
  fd_zbrn_id          VARCHAR(64)  NULL,
  fd_zbrn_status      VARCHAR(64)  NULL,
  fd_zbrn_date        DATE NULL,
  customer_first_name VARCHAR(128) NULL,
  city                VARCHAR(128) NULL,
  franchisee_id       VARCHAR(64)  NULL,
  franchisee_name     VARCHAR(128) NULL,
  branch              VARCHAR(128) NULL,
  doc                 DATE NULL,
  ticket_no           VARCHAR(64)  NULL,
  call_type           VARCHAR(64)  NULL,
  machine_status      VARCHAR(64)  NULL,
  dop                 DATE NULL,
  doi                 DATE NULL,
  technician_name     VARCHAR(128) NULL,
  technician_no       VARCHAR(64)  NULL,
  mat_cat             VARCHAR(64)  NULL,
  product_id          VARCHAR(64)  NULL,
  model               VARCHAR(255) NULL,
  serial_number       VARCHAR(128) NOT NULL,
  survey_origin       VARCHAR(128) NULL,
  type_of_damage      VARCHAR(64)  NULL,
  customer_complaint  TEXT NULL,
  part_description    VARCHAR(255) NULL,
  part_code           VARCHAR(128) NULL,
  out_bound_del       VARCHAR(128) NULL,
  out_bound_del_date  DATE NULL,
  dealer_code         VARCHAR(64)  NULL,
  dealer_name         VARCHAR(128) NULL,
  bse_name            VARCHAR(128) NULL,
  industry            VARCHAR(128) NULL,
  ageing_days         INT NULL,
  raw_payload         JSON NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_product_serial_number UNIQUE (serial_number),
  INDEX idx_product_complaint_number (complaint_number),
  INDEX idx_product_fd_zbrn_status (fd_zbrn_status),
  INDEX idx_product_type_of_damage (type_of_damage),
  INDEX idx_product_ageing_days (ageing_days),
  INDEX idx_product_doc (doc)
) ENGINE=InnoDB;
`;

const CREATE_PART_REPLACEMENT_TABLE = `
CREATE TABLE IF NOT EXISTS part_replacement (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_number    VARCHAR(64)  NULL,
  branch              VARCHAR(128) NULL,
  spu_status          VARCHAR(64)  NULL,
  spu_created_date    DATE NULL,
  doc                 DATE NULL,
  doi                 DATE NULL,
  dop                 DATE NULL,
  ticket_no           VARCHAR(64)  NULL,
  machine_status      VARCHAR(64)  NULL,
  model               VARCHAR(255) NULL,
  serial_number       VARCHAR(128) NOT NULL,
  item_code           VARCHAR(128) NULL,
  description         VARCHAR(255) NULL,
  problem_description TEXT NULL,
  product_category    VARCHAR(64)  NULL,
  sub_category        VARCHAR(64)  NULL,
  rej_qty             INT DEFAULT 0,
  ageing_days         INT NULL,
  raw_payload         JSON NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_part_serial_number UNIQUE (serial_number),
  INDEX idx_part_complaint_number (complaint_number),
  INDEX idx_part_spu_status (spu_status),
  INDEX idx_part_sub_category (sub_category),
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
 * Safely adds a unique constraint to an existing table if it does not exist yet.
 */
async function addUniqueConstraintIfMissing(conn, tableName, indexName, columnName) {
  try {
    const [indexes] = await conn.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [dbName, tableName, indexName]
    );
    if (indexes.length === 0) {
      await conn.query(`ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`${indexName}\` UNIQUE (\`${columnName}\`)`);
      console.log(`ℹ️ Auto-migrated table '${tableName}': added unique constraint '${indexName}' on '${columnName}'`);
    }
  } catch (e) {
    console.warn(`Could not add unique constraint ${indexName} to ${tableName}:`, e.message);
  }
}

/**
 * Safely drops an index/unique constraint if it exists.
 */
async function dropConstraintIfExists(conn, tableName, constraintName) {
  try {
    const [indexes] = await conn.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [dbName, tableName, constraintName]
    );
    if (indexes.length > 0) {
      await conn.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${constraintName}\``);
      console.log(`ℹ️ Auto-migrated table '${tableName}': dropped index '${constraintName}'`);
    }
  } catch (e) {
    // Ignore error if index cannot be dropped
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

      // Auto-migrate columns for part_replacement
      await addColumnIfMissing(tempConn, 'part_replacement', 'spu_status', 'VARCHAR(64) NULL');
      await addColumnIfMissing(tempConn, 'part_replacement', 'spu_created_date', 'DATE NULL');
      await addColumnIfMissing(tempConn, 'part_replacement', 'item_code', 'VARCHAR(128) NULL');
      await addColumnIfMissing(tempConn, 'part_replacement', 'description', 'VARCHAR(255) NULL');
      await addColumnIfMissing(tempConn, 'part_replacement', 'problem_description', 'TEXT NULL');
      await addColumnIfMissing(tempConn, 'part_replacement', 'product_category', 'VARCHAR(64) NULL');
      await addColumnIfMissing(tempConn, 'part_replacement', 'sub_category', 'VARCHAR(64) NULL');
      await addColumnIfMissing(tempConn, 'part_replacement', 'rej_qty', 'INT DEFAULT 0');

      const tables = ['product_replacement', 'part_replacement'];
      for (const table of tables) {
        await addColumnIfMissing(tempConn, table, 'zmac_date', 'DATE NULL');
        await addColumnIfMissing(tempConn, table, 'zmac_status', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'fd_zbrn_id', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'fd_zbrn_date', 'DATE NULL');
        await addColumnIfMissing(tempConn, table, 'customer_first_name', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'city', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'franchisee_id', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'franchisee_name', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'branch', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'ticket_no', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'call_type', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'machine_status', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'dop', 'DATE NULL');
        await addColumnIfMissing(tempConn, table, 'technician_name', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'technician_no', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'mat_cat', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'product_id', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'survey_origin', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'customer_complaint', 'TEXT NULL');
        await addColumnIfMissing(tempConn, table, 'part_code', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'part_description', 'VARCHAR(255) NULL');
        await addColumnIfMissing(tempConn, table, 'out_bound_del', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'out_bound_del_date', 'DATE NULL');
        await addColumnIfMissing(tempConn, table, 'dealer_code', 'VARCHAR(64) NULL');
        await addColumnIfMissing(tempConn, table, 'dealer_name', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'bse_name', 'VARCHAR(128) NULL');
        await addColumnIfMissing(tempConn, table, 'industry', 'VARCHAR(128) NULL');
      }

      await addUniqueConstraintIfMissing(tempConn, 'product_replacement', 'uq_product_serial_number', 'serial_number');
      await addUniqueConstraintIfMissing(tempConn, 'part_replacement', 'uq_part_serial_number', 'serial_number');

      // Drop legacy UNIQUE constraints to allow all uploaded rows to save
      await dropConstraintIfExists(tempConn, 'product_replacement', 'uq_product_complaint_number');
      await dropConstraintIfExists(tempConn, 'part_replacement', 'uq_part_complaint_number');
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
