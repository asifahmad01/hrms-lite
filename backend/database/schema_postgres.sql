-- =============================================================
-- HRMS Lite — PostgreSQL Schema  (v2 — Employee enhanced)
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
-- 1. ENUMs
-- ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE employmenttype AS ENUM (
        'FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE employeestatus AS ENUM (
        'ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE leavetype AS ENUM (
        'ANNUAL', 'SICK', 'CASUAL', 'UNPAID', 'MATERNITY', 'PATERNITY'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE leavestatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────
-- 2. Table: employees
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    id              SERIAL          PRIMARY KEY,
    employee_code   VARCHAR(20)     NOT NULL,          -- e.g. "EMP-001"
    full_name       VARCHAR(255)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    department      VARCHAR(100)    NOT NULL,
    phone           VARCHAR(30),
    designation     VARCHAR(100),
    joining_date    DATE,
    employment_type employmenttype  NOT NULL DEFAULT 'FULL_TIME',
    status          employeestatus  NOT NULL DEFAULT 'ACTIVE',
    manager_name    VARCHAR(255),
    location        VARCHAR(100),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_employees_employee_code UNIQUE (employee_code),
    CONSTRAINT uq_employees_email         UNIQUE (email)
);

-- Supporting indexes on employees
CREATE INDEX IF NOT EXISTS idx_employees_department  ON employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_status      ON employees (status);
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
-- 4. Table: leave_requests
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
    id          SERIAL          PRIMARY KEY,
    employee_fk INTEGER         NOT NULL,
    leave_type  leavetype       NOT NULL,
    start_date  DATE            NOT NULL,
    end_date    DATE            NOT NULL,
    reason      TEXT            NOT NULL,
    status      leavestatus     NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- end_date must not precede start_date
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date),

    CONSTRAINT fk_leave_requests_employee
        FOREIGN KEY (employee_fk)
        REFERENCES employees (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Supporting indexes on leave_requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_fk ON leave_requests (employee_fk);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status      ON leave_requests (status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date  ON leave_requests (start_date DESC);
-- Composite: fast employee+status queries (e.g. "all PENDING for employee X")
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_status  ON leave_requests (employee_fk, status);


-- ─────────────────────────────────────────
-- 5. Quick sanity check (optional)
-- ─────────────────────────────────────────
-- SELECT table_name, column_name, data_type
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  table_name   IN ('employees', 'attendance', 'leave_requests')
-- ORDER  BY table_name, ordinal_position;
