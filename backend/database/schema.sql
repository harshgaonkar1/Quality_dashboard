-- ============================================================
-- ENTERPRISE DASHBOARD - MYSQL SCHEMA
-- ============================================================
-- This schema supports two data domains: Product Replacement and
-- Part Replacement. Excel is only used as an initial data-loading
-- mechanism -- the application always reads from these tables.
-- ============================================================

-- Check if database 'dashboard_db' exists: create if not present, then select for use
CREATE DATABASE IF NOT EXISTS dashboard_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dashboard_db;

-- ------------------------------------------------------------
-- TABLE: product_replacement
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_replacement (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_number    VARCHAR(64)  NULL,       -- ZMAC ID
  zmac_date           DATE NULL,               -- zmac date
  zmac_status         VARCHAR(64)  NULL,       -- zmac status
  fd_zbrn_id          VARCHAR(64)  NULL,       -- fd zbrn id
  fd_zbrn_status      VARCHAR(64)  NULL,       -- fd zbrn status
  fd_zbrn_date        DATE NULL,               -- fd zbrn date
  customer_first_name VARCHAR(128) NULL,       -- customer first name
  city                VARCHAR(128) NULL,       -- city
  franchisee_id       VARCHAR(64)  NULL,       -- franchisee id
  franchisee_name     VARCHAR(128) NULL,       -- franchisee name
  branch              VARCHAR(128) NULL,       -- branch name
  doc                 DATE NULL,               -- ticket posting date
  ticket_no           VARCHAR(64)  NULL,       -- ticket no
  call_type           VARCHAR(64)  NULL,       -- call type
  machine_status      VARCHAR(64)  NULL,       -- machine status
  dop                 DATE NULL,               -- dop
  doi                 DATE NULL,               -- doi
  technician_name     VARCHAR(128) NULL,       -- technician name
  technician_no       VARCHAR(64)  NULL,       -- technician no
  mat_cat             VARCHAR(64)  NULL,       -- mat cat
  product_id          VARCHAR(64)  NULL,       -- product id
  model               VARCHAR(255) NULL,       -- product description
  serial_number       VARCHAR(128) NOT NULL,      -- serial number
  survey_origin       VARCHAR(128) NULL,       -- survey origin
  type_of_damage      VARCHAR(64)  NULL,       -- type of damage
  customer_complaint  TEXT NULL,               -- customer complaint
  part_description    VARCHAR(255) NULL,       -- spare desc
  part_code           VARCHAR(128) NULL,       -- spare
  out_bound_del       VARCHAR(128) NULL,       -- out bound del
  out_bound_del_date  DATE NULL,               -- out bound del date
  dealer_code         VARCHAR(64)  NULL,       -- dealer code
  dealer_name         VARCHAR(128) NULL,       -- dealer name
  bse_name            VARCHAR(128) NULL,       -- BSE Name
  industry            VARCHAR(128) NULL,       -- Industry
  ageing_days         INT NULL,                -- DOC - DOI in days
  raw_payload         JSON NULL,               -- original row snapshot for audit/debug
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_product_serial_number UNIQUE (serial_number),
  INDEX idx_product_complaint_number (complaint_number),
  INDEX idx_product_fd_zbrn_status (fd_zbrn_status),
  INDEX idx_product_type_of_damage (type_of_damage),
  INDEX idx_product_ageing_days (ageing_days),
  INDEX idx_product_doc (doc)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLE: part_replacement
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS part_replacement (
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
  part_number         VARCHAR(128) NULL,
  part_name           VARCHAR(128) NULL,
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

  CONSTRAINT uq_part_serial_number UNIQUE (serial_number),
  INDEX idx_part_complaint_number (complaint_number),
  INDEX idx_part_fd_zbrn_status (fd_zbrn_status),
  INDEX idx_part_type_of_damage (type_of_damage),
  INDEX idx_part_ageing_days (ageing_days),
  INDEX idx_part_doc (doc)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLE: upload_logs
-- Keeps an audit trail of every Excel upload for traceability.
-- ------------------------------------------------------------
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
