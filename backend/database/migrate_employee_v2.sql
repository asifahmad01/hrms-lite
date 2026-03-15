-- =============================================================
-- HRMS Lite — Employee v2 Migration
-- Run this script ONCE against an existing database that was
-- created with schema_postgres.sql v1 (employee_id column).
--
-- For a FRESH install: use schema_postgres.sql directly instead.
-- =============================================================

-- ─────────────────────────────────────────
-- 1. Create new ENUM types (idempotent)
-- ─────────────────────────────────────────
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


-- ─────────────────────────────────────────
-- 2. Rename employee_id → employee_code
--    (skipped safely if already renamed)
-- ─────────────────────────────────────────
DO $$ BEGIN
    ALTER TABLE employees RENAME COLUMN employee_id TO employee_code;
EXCEPTION
    WHEN undefined_column THEN NULL;  -- column already renamed
END $$;

-- Rename the unique constraint to match the new column name
DO $$ BEGIN
    ALTER TABLE employees
        RENAME CONSTRAINT uq_employees_employee_id TO uq_employees_employee_code;
EXCEPTION
    WHEN undefined_object THEN NULL;  -- already renamed or doesn't exist
END $$;


-- ─────────────────────────────────────────
-- 3. Add new nullable / defaulted columns
--    (each is idempotent via IF NOT EXISTS)
-- ─────────────────────────────────────────
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS phone           VARCHAR(30),
    ADD COLUMN IF NOT EXISTS designation     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS joining_date    DATE,
    ADD COLUMN IF NOT EXISTS manager_name    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS location        VARCHAR(100);

-- employment_type with server default (existing rows get FULL_TIME)
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS employment_type employmenttype NOT NULL DEFAULT 'FULL_TIME';

-- status with server default (existing rows get ACTIVE)
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS status employeestatus NOT NULL DEFAULT 'ACTIVE';


-- ─────────────────────────────────────────
-- 4. Add new indexes
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees (status);


-- ─────────────────────────────────────────
-- 5. Verify (run manually to check results)
-- ─────────────────────────────────────────
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public' AND table_name = 'employees'
-- ORDER  BY ordinal_position;
