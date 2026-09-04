// ============================================================
// Upload Persistence Service
// ------------------------------------------------------------
// Batch-inserts records into product_replacement or part_replacement
// using Supabase JS client (or PG pool fallback) with ON CONFLICT
// (serial_number) DO NOTHING semantics so duplicates are skipped.
// ============================================================

const { supabase } = require('../database/supabaseClient');
const { pool } = require('../database/connection');

const TABLE_CONFIG = {
  PRODUCT_REPLACEMENT: {
    table: 'product_replacement',
    columns: [
      'complaint_number', 'zmac_date', 'zmac_status', 'fd_zbrn_id', 'fd_zbrn_status', 'fd_zbrn_date',
      'customer_first_name', 'city', 'franchisee_id', 'franchisee_name', 'branch', 'doc', 'ticket_no',
      'call_type', 'machine_status', 'dop', 'doi', 'technician_name', 'technician_no', 'mat_cat',
      'product_id', 'model', 'serial_number', 'survey_origin', 'type_of_damage', 'customer_complaint',
      'part_description', 'part_code', 'out_bound_del', 'out_bound_del_date', 'dealer_code', 'dealer_name',
      'bse_name', 'industry', 'ageing_days', 'raw_payload',
    ],
  },
  PART_REPLACEMENT: {
    table: 'part_replacement',
    columns: [
      'branch', 'franchise', 'spu_status', 'spu_created_date', 'doc', 'ticket_no',
      'machine_status', 'sub_category', 'model', 'serial_number', 'doi', 'dop',
      'item_code', 'description', 'approved_qty', 'rej_qty', 'ageing_days',
      'part_grouping', 'grouping', 'complaint_number', 'problem_description',
      'product_category', 'raw_payload',
    ],
    conflictKey: 'serial_number',
  },
  PART_GROUPING: {
    table: 'part_grouping',
    columns: ['item_code', 'part_code', 'part_name', 'part_description', 'part_grouping', 'category'],
    conflictKey: 'item_code',
  },
};

const BATCH_SIZE = 500;

/**
 * Batch-inserts records into the target table in chunks, guaranteeing
 * Complaint/Serial Number uniqueness via ON CONFLICT DO NOTHING.
 *
 * @param {'PRODUCT_REPLACEMENT'|'PART_REPLACEMENT'|'PART_GROUPING'} uploadType
 * @param {object[]} records
 * @returns {Promise<{insertedRows:number, duplicateRows:number}>}
 */
async function batchInsert(uploadType, records) {
  const config = TABLE_CONFIG[uploadType];
  if (!config) throw new Error(`Unknown upload type: ${uploadType}`);
  if (records.length === 0) return { insertedRows: 0, duplicateRows: 0 };

  const conflictKey = config.conflictKey || 'serial_number';

  if (supabase) {
    let insertedRows = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const chunk = records.slice(i, i + BATCH_SIZE);
      const cleanedChunk = chunk.map((record) => {
        const row = {};
        config.columns.forEach((col) => {
          row[col] = record[col] ?? null;
        });
        return row;
      });

      let res;
      if (uploadType === 'PART_REPLACEMENT') {
        res = await supabase
          .from(config.table)
          .insert(cleanedChunk)
          .select('id');
      } else {
        res = await supabase
          .from(config.table)
          .upsert(cleanedChunk, { onConflict: conflictKey, ignoreDuplicates: uploadType !== 'PART_GROUPING' })
          .select('id');
      }

      const { data, error } = res;

      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
          throw new Error(`Database Schema Error: Table or column missing in Supabase. Please run 'backend/database/schema.sql' in your Supabase SQL Editor. (${error.message})`);
        }
        throw new Error(`Supabase insert error: ${error.message}`);
      }
      const count = data ? data.length : chunk.length;
      insertedRows += count;
    }

    const duplicateRows = records.length - insertedRows;

    // Automatically trigger QA lookup sync
    if (uploadType === 'PART_REPLACEMENT' || uploadType === 'PART_GROUPING') {
      try {
        const partReplacementModel = require('../models/partReplacementModel');
        partReplacementModel.syncPartGroupingLookup().catch(() => {});
      } catch (e) {}
    }

    return { insertedRows, duplicateRows };
  }

  // Fallback to PG Pool if Supabase client is not configured
  if (!pool) return { insertedRows: 0, duplicateRows: 0 };

  const connection = await pool.getConnection();
  let insertedRows = 0;
  let duplicateRows = 0;

  try {
    await connection.beginTransaction();

    const columnList = config.columns.map((c) => `"${c}"`).join(', ');
    const placeholders = `(${config.columns.map(() => '?').join(', ')})`;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const chunk = records.slice(i, i + BATCH_SIZE);
      const valuesSql = chunk.map(() => placeholders).join(', ');
      const flatParams = chunk.flatMap((record) => config.columns.map((col) => record[col] ?? null));

      const conflictClause = uploadType === 'PART_REPLACEMENT' ? '' : ` ON CONFLICT (${conflictKey}) DO NOTHING`;
      const [result] = await connection.query(
        `INSERT INTO "${config.table}" (${columnList}) VALUES ${valuesSql}${conflictClause}`,
        flatParams
      );

      const affected = result ? result.affectedRows : 0;
      insertedRows += affected;
      duplicateRows += chunk.length - affected;
    }

    await connection.commit();

    if (uploadType === 'PART_REPLACEMENT' || uploadType === 'PART_GROUPING') {
      try {
        const partReplacementModel = require('../models/partReplacementModel');
        partReplacementModel.syncPartGroupingLookup().catch(() => {});
      } catch (e) {}
    }

    return { insertedRows, duplicateRows };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}


/**
 * Writes a row to upload_logs summarizing the outcome of an upload.
 */
async function logUpload({
  uploadType,
  fileName,
  totalRows,
  insertedRows,
  skippedRows,
  duplicateRows,
  errorRows,
  status,
  errorDetails,
}) {
  if (supabase) {
    const { error } = await supabase.from('upload_logs').insert([
      {
        upload_type: uploadType,
        file_name: fileName,
        total_rows: totalRows,
        inserted_rows: insertedRows,
        skipped_rows: skippedRows,
        duplicate_rows: duplicateRows,
        error_rows: errorRows,
        status: status,
        error_details: errorDetails || null,
      },
    ]);
    if (error) console.error('⚠️ Failed to log upload to Supabase upload_logs:', error.message);
    return;
  }

  await pool.query(
    `INSERT INTO upload_logs
      (upload_type, file_name, total_rows, inserted_rows, skipped_rows, duplicate_rows, error_rows, status, error_details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uploadType,
      fileName,
      totalRows,
      insertedRows,
      skippedRows,
      duplicateRows,
      errorRows,
      status,
      errorDetails ? JSON.stringify(errorDetails) : null,
    ]
  );
}

module.exports = { batchInsert, logUpload };
