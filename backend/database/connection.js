// ============================================================
// Supabase PostgreSQL Connection Pool & Schema Auto-Initialization
// ------------------------------------------------------------
// Manages connectivity via official Supabase JS SDK (over HTTP)
// or PostgreSQL connection pool (over TCP) when configured.
// Automatically verifies and creates schema tables when possible,
// by executing the SQL directly from schema.sql (single source
// of truth for table definitions).
// ============================================================

const fs = require('fs');
const path = require('path');
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
    } catch (e) { }
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

const SCHEMA_FILE_PATH = path.join(__dirname, 'schema.sql');

/**
 * Reads schema.sql from disk. Throws if the file is missing,
 * so failures are explicit rather than silently skipping schema setup.
 */
function loadSchemaSql() {
  return fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
}

let initPromise = null;

function convertPlaceholders(sql) {
  if (!sql || typeof sql !== 'string') return sql;
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

/**
 * Executes schema.sql against the database, once, memoized via initPromise.
 * Runs inside a transaction so a bad statement doesn't leave a half-applied schema.
 */
async function ensureDatabaseAndSchema() {
  if (!pool) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let client;
    try {
      client = await pool.connect();
      const schemaSql = loadSchemaSql();

      try {
        await client.query('BEGIN');
        await client.query(schemaSql);
        await client.query('COMMIT');
        console.log('✅ Auto-created/verified schema tables in PostgreSQL (from schema.sql)');
      } catch (schemaErr) {
        await client.query('ROLLBACK');
        throw schemaErr;
      }
    } catch (err) {
      initPromise = null;
      if (err.code === 'ENOENT') {
        console.warn(`⚠️ Auto-schema creation skipped: schema.sql not found at ${SCHEMA_FILE_PATH}`);
      } else {
        console.warn('⚠️ Auto-schema creation skipped (TCP connection unavailable or query failed):', err.message);
      }
    } finally {
      if (client) client.release();
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