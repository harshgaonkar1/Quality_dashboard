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
  complaint_number    VARCHAR(64)  NOT NULL,
  model               VARCHAR(128) NULL,
  branch              VARCHAR(128) NULL,
  mat_cat             VARCHAR(64)  NULL,
  machine_status      VARCHAR(64)  NULL,
  serial_number       VARCHAR(128) NULL,
  doi                 DATE NULL,              -- Date of Installation
  doc                 DATE NULL,               -- Date of Complaint
  ageing_days         INT NULL,                -- DOC - DOI in days
  fd_zbrn_status      VARCHAR(64) NULL,        -- Approved / Approved for Upgrade / etc
  type_of_damage      VARCHAR(64) NULL,        -- Functional / etc
  raw_payload         JSON NULL,               -- original row snapshot for audit/debug
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_product_complaint_number UNIQUE (complaint_number),
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
