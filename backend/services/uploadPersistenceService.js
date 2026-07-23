// ============================================================
// Upload Persistence Service
// ------------------------------------------------------------
// Handles batch-inserting processed records into either the
// product_replacement or part_replacement table, using
// "INSERT IGNORE" semantics so Complaint Numbers already present
// in the database are silently skipped (never duplicated), and
// logs the outcome of every upload to upload_logs for auditing.
// ============================================================

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
      'complaint_number', 'zmac_date', 'zmac_status', 'fd_zbrn_id', 'fd_zbrn_status', 'fd_zbrn_date',
      'customer_first_name', 'city', 'franchisee_id', 'franchisee_name', 'branch', 'doc', 'ticket_no',
      'call_type', 'machine_status', 'dop', 'doi', 'technician_name', 'technician_no', 'mat_cat',
      'product_id', 'model', 'serial_number', 'part_number', 'part_name', 'survey_origin', 'type_of_damage',
      'customer_complaint', 'part_description', 'part_code', 'out_bound_del', 'out_bound_del_date', 'dealer_code',
      'dealer_name', 'bse_name', 'industry', 'ageing_days', 'raw_payload',
    ],
  },
};

const BATCH_SIZE = 500;

/**
 * Batch-inserts records into the target table in chunks, using
 * INSERT IGNORE to guarantee Complaint Number uniqueness at the DB layer
 * (belt-and-braces alongside the in-file dedupe done in ageingService).
 *
 * @param {'PRODUCT_REPLACEMENT'|'PART_REPLACEMENT'} uploadType
 * @param {object[]} records
 * @returns {Promise<{insertedRows:number, duplicateRows:number}>}
 */
async function batchInsert(uploadType, records) {
  const config = TABLE_CONFIG[uploadType];
  if (!config) throw new Error(`Unknown upload type: ${uploadType}`);
  if (records.length === 0) return { insertedRows: 0, duplicateRows: 0 };

  const connection = await pool.getConnection();
  let insertedRows = 0;
  let duplicateRows = 0;

  try {
    await connection.beginTransaction();

    const columnList = config.columns.join(', ');
    const placeholders = `(${config.columns.map(() => '?').join(', ')})`;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const chunk = records.slice(i, i + BATCH_SIZE);
      const valuesSql = chunk.map(() => placeholders).join(', ');
      const flatParams = chunk.flatMap((record) => config.columns.map((col) => record[col] ?? null));

      const [result] = await connection.query(
        `INSERT IGNORE INTO ${config.table} (${columnList}) VALUES ${valuesSql}`,
        flatParams
      );

      insertedRows += result.affectedRows;
      duplicateRows += chunk.length - result.affectedRows;
    }

    await connection.commit();
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
