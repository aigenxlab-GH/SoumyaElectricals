-- V11: Add separate overtime rate for managers
-- Previously only one overtime_rate_per_hour existed for all roles.
-- Now managers have their own rate; employees use overtime_rate_per_hour (renamed conceptually to employee rate).
-- Apply manually via Supabase SQL editor.

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS manager_overtime_rate_per_hour NUMERIC(8,2) NOT NULL DEFAULT 150.00;
