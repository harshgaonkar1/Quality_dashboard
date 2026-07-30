// ============================================================
// Supabase PostgreSQL Connection Pool & Schema Auto-Initialization
// ------------------------------------------------------------
// Manages connectivity via official Supabase JS SDK (over HTTP)
// or PostgreSQL connection pool (over TCP) when configured.
// Automatically verifies and creates schema tables when possible.
// ============================================================

const { Pool } = require('pg');
const { supabase } = require('./supabaseClient');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

let pool = null;
if (connectionString || (process.env.DB_PASSWORD && process.env.DB_PASSWORD !== 'YOUR_SUPABASE_DB_PASSWORD')) {
  let derivedHost = process.env.DB_HOST;
  if (!derivedHost && process.env.SUPABASE_URL) {
    try {
      const urlObj = new URL(process.env.SUPABASE_URL);
      const hostParts = urlObj.hostname.split('.');
      if (hostParts.length > 0 && hostParts[0]) {
        derivedHost = `db.${hostParts[0]}.supabase.co`;
      }
    } catch (e) {}
  }
  const pgConfig = connectionString
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : {
        host: derivedHost || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        ssl: process.env.DB_SSL === 'true' || (derivedHost && derivedHost.includes('supabase.co')) ? { rejectUnauthorized: false } : false,
        max: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
      };
  pool = new Pool(pgConfig);
}

const CREATE_PRODUCT_REPLACEMENT_TABLE = `
CREATE TABLE IF NOT EXISTS product_replacement (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  admin_comment       TEXT NULL,
  raw_payload         JSONB NULL,
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_product_serial_number UNIQUE (serial_number)
);

CREATE INDEX IF NOT EXISTS idx_product_complaint_number ON product_replacement (complaint_number);
CREATE INDEX IF NOT EXISTS idx_product_fd_zbrn_status ON product_replacement (fd_zbrn_status);
CREATE INDEX IF NOT EXISTS idx_product_type_of_damage ON product_replacement (type_of_damage);
CREATE INDEX IF NOT EXISTS idx_product_ageing_days ON product_replacement (ageing_days);
CREATE INDEX IF NOT EXISTS idx_product_doc ON product_replacement (doc);
`;

const CREATE_PART_REPLACEMENT_TABLE = `
CREATE TABLE IF NOT EXISTS part_replacement (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  type_of_damage      VARCHAR(64)  NULL,
  ageing_days         INT NULL,
  admin_comment       TEXT NULL,
  raw_payload         JSONB NULL,
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_part_serial_number UNIQUE (serial_number)
);

CREATE INDEX IF NOT EXISTS idx_part_complaint_number ON part_replacement (complaint_number);
CREATE INDEX IF NOT EXISTS idx_part_spu_status ON part_replacement (spu_status);
CREATE INDEX IF NOT EXISTS idx_part_sub_category ON part_replacement (sub_category);
CREATE INDEX IF NOT EXISTS idx_part_ageing_days ON part_replacement (ageing_days);
CREATE INDEX IF NOT EXISTS idx_part_doc ON part_replacement (doc);
`;

const CREATE_UPLOAD_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS upload_logs (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  upload_type      VARCHAR(64) NOT NULL CHECK (upload_type IN ('PRODUCT_REPLACEMENT', 'PART_REPLACEMENT')),
  file_name        VARCHAR(255) NOT NULL,
  total_rows       INT DEFAULT 0,
  inserted_rows    INT DEFAULT 0,
  skipped_rows     INT DEFAULT 0,
  duplicate_rows   INT DEFAULT 0,
  error_rows       INT DEFAULT 0,
  status           VARCHAR(32) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
  error_details    JSONB NULL,
  created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_upload_logs_type ON upload_logs (upload_type);
`;

let initPromise = null;

function convertPlaceholders(sql) {
  if (!sql || typeof sql !== 'string') return sql;
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

async function ensureDatabaseAndSchema() {
  if (!pool) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const client = await pool.connect();
      try {
        await client.query(CREATE_PRODUCT_REPLACEMENT_TABLE);
        await client.query(CREATE_PART_REPLACEMENT_TABLE);
        await client.query(CREATE_UPLOAD_LOGS_TABLE);
        console.log('✅ Auto-created/verified schema tables in PostgreSQL');
      } finally {
        client.release();
      }
    } catch (err) {
      initPromise = null;
      console.warn('⚠️ Auto-schema creation skipped (TCP connection unavailable):', err.message);
    }
  })();

  return initPromise;
}

if (pool) {
  const originalQuery = pool.query.bind(pool);
  pool.query = async function (text, params) {
    await ensureDatabaseAndSchema();
    const pgSql = convertPlaceholders(text);
    const res = await originalQuery(pgSql, params);
    return [res.rows, { affectedRows: res.rowCount, ...res }];
  };

  pool.getConnection = async function () {
    await ensureDatabaseAndSchema();
    const client = await pool.connect();
    const originalClientQuery = client.query.bind(client);
    client.query = async function (text, params) {
      const pgSql = convertPlaceholders(text);
      const res = await originalClientQuery(pgSql, params);
      return [res.rows, { affectedRows: res.rowCount, ...res }];
    };
    client.beginTransaction = async () => originalClientQuery('BEGIN');
    client.commit = async () => originalClientQuery('COMMIT');
    client.rollback = async () => originalClientQuery('ROLLBACK');
    return client;
  };
}

/**
 * Verifies connection and checks if Supabase tables exist.
 */
async function testConnection() {
  if (supabase) {
    try {
      const { error } = await supabase.from('product_replacement').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('\n⚠️ TABLE MISSING NOTICE: Table "product_replacement" does not exist in Supabase yet.');
          console.warn('👉 Please run `backend/database/schema.sql` in your Supabase Dashboard -> SQL Editor to create tables.\n');
        } else {
          console.warn('ℹ️ Supabase API connection check:', error.message);
        }
      } else {
        console.log(`✅ Supabase connected successfully via API (${process.env.SUPABASE_URL})`);
      }
    } catch (e) {
      console.warn('ℹ️ Supabase API check notice:', e.message);
    }
  }

  if (pool) {
    try {
      await ensureDatabaseAndSchema();
      console.log('✅ Supabase PostgreSQL connected via TCP pool');
    } catch (error) {
      console.warn('ℹ️ PostgreSQL TCP pool notice:', error.message);
    }
  }
}

module.exports = { pool, testConnection, ensureDatabaseAndSchema };
