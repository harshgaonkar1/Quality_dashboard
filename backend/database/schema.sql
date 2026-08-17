-- ============================================================
-- ENTERPRISE DASHBOARD - SUPABASE POSTGRESQL SCHEMA (SELF-HEALING)
-- ============================================================
-- Run this script in Supabase Dashboard -> SQL Editor.
-- Creates missing tables AND adds any missing columns automatically.
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: product_replacement
-- ------------------------------------------------------------
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
  action_done         TEXT NULL,
  responsible_person  VARCHAR(128) NULL,
  initiator_name      VARCHAR(128) NULL,
  action_plan_date    TIMESTAMPTZ NULL,
  raw_payload         JSONB NULL,
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_product_serial_number UNIQUE (serial_number)
);

-- Ensure all columns are added if product_replacement already existed
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS ageing_days INT NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS admin_comment TEXT NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS action_done TEXT NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS responsible_person VARCHAR(128) NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS initiator_name VARCHAR(128) NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS action_plan_date TIMESTAMPTZ NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS raw_payload JSONB NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS fd_zbrn_status VARCHAR(64) NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS mat_cat VARCHAR(64) NULL;
ALTER TABLE product_replacement ADD COLUMN IF NOT EXISTS machine_status VARCHAR(64) NULL;

CREATE INDEX IF NOT EXISTS idx_product_complaint_number ON product_replacement (complaint_number);
CREATE INDEX IF NOT EXISTS idx_product_fd_zbrn_status ON product_replacement (fd_zbrn_status);
CREATE INDEX IF NOT EXISTS idx_product_type_of_damage ON product_replacement (type_of_damage);
CREATE INDEX IF NOT EXISTS idx_product_ageing_days ON product_replacement (ageing_days);
CREATE INDEX IF NOT EXISTS idx_product_doc ON product_replacement (doc);

-- ------------------------------------------------------------
-- TABLE: part_replacement
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS part_replacement (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complaint_number    VARCHAR(64)  NULL,
  branch              VARCHAR(128) NULL,
  franchise           VARCHAR(128) NULL,
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
  approved_qty        INT DEFAULT 0,
  rej_qty             INT DEFAULT 0,
  type_of_damage      VARCHAR(64)  NULL,
  ageing_days         INT NULL,
  admin_comment       TEXT NULL,
  raw_payload         JSONB NULL,
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_part_serial_number UNIQUE (serial_number)
);

-- Ensure all columns are added if part_replacement already existed
ALTER TABLE part_replacement ADD COLUMN IF NOT EXISTS ageing_days INT NULL;
ALTER TABLE part_replacement ADD COLUMN IF NOT EXISTS admin_comment TEXT NULL;
ALTER TABLE part_replacement ADD COLUMN IF NOT EXISTS raw_payload JSONB NULL;
ALTER TABLE part_replacement ADD COLUMN IF NOT EXISTS sub_category VARCHAR(64) NULL;
ALTER TABLE part_replacement ADD COLUMN IF NOT EXISTS franchise VARCHAR(128) NULL;
ALTER TABLE part_replacement ADD COLUMN IF NOT EXISTS approved_qty INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_part_complaint_number ON part_replacement (complaint_number);
CREATE INDEX IF NOT EXISTS idx_part_spu_status ON part_replacement (spu_status);
CREATE INDEX IF NOT EXISTS idx_part_sub_category ON part_replacement (sub_category);
CREATE INDEX IF NOT EXISTS idx_part_ageing_days ON part_replacement (ageing_days);
CREATE INDEX IF NOT EXISTS idx_part_doc ON part_replacement (doc);

-- ------------------------------------------------------------
-- TABLE: upload_logs
-- ------------------------------------------------------------
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
