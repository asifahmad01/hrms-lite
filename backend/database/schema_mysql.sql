-- =============================================================
-- HRMS Lite — MySQL Schema
-- Database : hrms_lite
-- Engine   : InnoDB (required for FK + transactions)
-- Charset  : utf8mb4
-- =============================================================

-- ─────────────────────────────────────────
-- 0. Setup
-- ─────────────────────────────────────────
-- Run as root once:
--   CREATE DATABASE hrms_lite
--       CHARACTER SET utf8mb4
--       COLLATE utf8mb4_unicode_ci;
--   CREATE USER 'hrms_user'@'localhost' IDENTIFIED BY 'changeme';
--   GRANT ALL PRIVILEGES ON hrms_lite.* TO 'hrms_user'@'localhost';
--   FLUSH PRIVILEGES;
--   USE hrms_lite;

CREATE DATABASE IF NOT EXISTS hrms_lite
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE hrms_lite;


-- ─────────────────────────────────────────
-- 1. Table: employees
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    employee_id VARCHAR(20)      NOT NULL,          -- e.g. "EMP-001"
    full_name   VARCHAR(255)     NOT NULL,
    email       VARCHAR(255)     NOT NULL,
    department  VARCHAR(100)     NOT NULL,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_employees_employee_id UNIQUE (employee_id),
    CONSTRAINT uq_employees_email       UNIQUE (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Supporting indexes on employees
CREATE INDEX idx_employees_department ON employees (department);
CREATE INDEX idx_employees_created_at ON employees (created_at);


-- ─────────────────────────────────────────
-- 2. Table: attendance
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id          INT UNSIGNED                 NOT NULL AUTO_INCREMENT,
    employee_fk INT UNSIGNED                 NOT NULL,
    date        DATE                         NOT NULL,
    status      ENUM('PRESENT', 'ABSENT')    NOT NULL,
    created_at  DATETIME                     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- One record per employee per day
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_fk, date),

    -- FK — cascade delete keeps orphan rows from accumulating
    CONSTRAINT fk_attendance_employee
        FOREIGN KEY (employee_fk)
        REFERENCES employees (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Supporting indexes on attendance
-- Note: (employee_fk, date) is already covered by the UNIQUE key above
CREATE INDEX idx_attendance_date   ON attendance (date);
CREATE INDEX idx_attendance_status ON attendance (status);
-- Composite: fast "all records for a date range" queries
CREATE INDEX idx_attendance_emp_date ON attendance (employee_fk, date);
