-- =============================================================
-- HRMS Lite — Leave Requests v1 Migration
-- Creates the leavetype enum, leavestatus enum, and
-- leave_requests table on an existing database.
-- Safe to run repeatedly (all statements are idempotent).
-- =============================================================

-- ─────────────────────────────────────────
-- 1. ENUMs
-- ─────────────────────────────────────────

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
-- 2. Table
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

    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date),

    CONSTRAINT fk_leave_requests_employee
        FOREIGN KEY (employee_fk)
        REFERENCES employees (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ─────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_fk ON leave_requests (employee_fk);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status      ON leave_requests (status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date  ON leave_requests (start_date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_status  ON leave_requests (employee_fk, status);
