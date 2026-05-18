-- V32 — Remove payroll status lifecycle
-- ===================================================================
-- BEFORE: payrolls had status (draft/finalised/paid) + finalised_at +
--         paid_at columns with a 3-step lifecycle.
-- AFTER:  one saved record per (user, period). Generate creates; Re-
--         Generate overwrites; Delete removes. No state transitions.
-- ===================================================================

BEGIN;

ALTER TABLE payrolls
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS finalised_at,
  DROP COLUMN IF EXISTS paid_at;

-- Enum left in place (harmless) in case any external script still references it.
-- To drop fully: DROP TYPE IF EXISTS payroll_status;

COMMIT;
