-- =============================================================
-- HRMS Lite — PostgreSQL Schema
-- Database : hrms_lite
-- =============================================================

-- ─────────────────────────────────────────
-- 0. Setup
-- ─────────────────────────────────────────
-- Run as a superuser once:
--   CREATE DATABASE hrms_lite;
--   CREATE USER hrms_user WITH PASSWORD 'changeme';
--   GRANT ALL PRIVILEGES ON DATABASE hrms_lite TO hrms_user;
--   \c hrms_lite
--   GRANT ALL ON SCHEMA public TO hrms_user;

-- ─────────────────────────────────────────
-- 1. ENUM: attendance status
-- ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;   -- idempotent re-runs
END $$;


-- ─────────────────────────────────────────
-- 2. Table: employees
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    id          SERIAL          PRIMARY KEY,
    employee_id VARCHAR(20)     NOT NULL,          -- e.g. "EMP-001"
    full_name   VARCHAR(255)    NOT NULL,
    email       VARCHAR(255)    NOT NULL,
    department  VARCHAR(100)    NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_employees_employee_id UNIQUE (employee_id),
    CONSTRAINT uq_employees_email       UNIQUE (email)
);

-- Supporting indexes on employees
CREATE INDEX IF NOT EXISTS idx_employees_department  ON employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_created_at  ON employees (created_at DESC);


-- ─────────────────────────────────────────
-- 3. Table: attendance
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id          SERIAL              PRIMARY KEY,
    employee_fk INTEGER             NOT NULL,
    date        DATE                NOT NULL,
    status      attendance_status   NOT NULL,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- One record per employee per day
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_fk, date),

    -- FK — cascade delete keeps orphan rows from accumulating
    CONSTRAINT fk_attendance_employee
        FOREIGN KEY (employee_fk)
        REFERENCES employees (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Supporting indexes on attendance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_fk ON attendance (employee_fk);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance (date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status      ON attendance (status);
-- Composite: fast "employee's attendance in a date range" queries
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date    ON attendance (employee_fk, date DESC);


-- ─────────────────────────────────────────
-- 4. Quick sanity check (optional)
-- ─────────────────────────────────────────
-- SELECT table_name, column_name, data_type
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  table_name   IN ('employees', 'attendance')
-- ORDER  BY table_name, ordinal_position;
