-- V31 — Split approved leaves into "paid within balance" vs "unpaid LOP"
-- ===================================================================
-- BEFORE: payrolls stored a single `paid_leave_days` (= raw count of all
--         approved leaves in the period). LOP from the V26 writeoff was
--         tracked in `lop_from_writeoff_days` but the breakdown of which
--         approved leaves were paid vs unpaid was not exposed.
-- AFTER:  two new columns make the split explicit, so the payslip can show
--         "Paid leaves used: 10, Unpaid leaves (LOP): 7" for an employee who
--         applied 17 leaves with only 10 balance available.
--
-- Math: paid_leaves_within_balance = max(0, approved_leaves - writeoff)
--       unpaid_leaves_lop          = min(approved_leaves, writeoff)
-- ===================================================================

BEGIN;

ALTER TABLE payrolls
  ADD COLUMN IF NOT EXISTS paid_leaves_within_balance INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_leaves_lop          INT NOT NULL DEFAULT 0;

-- Backfill: derive the split for existing payrolls so the UI doesn't show 0/0.
UPDATE payrolls
SET    paid_leaves_within_balance = GREATEST(0, paid_leave_days - lop_from_writeoff_days),
       unpaid_leaves_lop          = LEAST(paid_leave_days, lop_from_writeoff_days);

COMMIT;
