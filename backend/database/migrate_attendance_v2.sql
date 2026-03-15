-- =============================================================
-- HRMS Lite — Attendance v2 Migration
-- Adds LEAVE and HALF_DAY values to the attendance_status enum
-- Safe to run on an existing database (idempotent)
-- =============================================================

-- PostgreSQL does not support IF NOT EXISTS for ALTER TYPE ADD VALUE,
-- so we wrap each in a DO block that silently skips if the value exists.

DO $$
BEGIN
    ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'LEAVE';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'HALF_DAY';
EXCEPTION WHEN others THEN NULL;
END $$;
