-- Add rejection tracking columns to quotations
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS rejected_by                    UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at                    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by_snapshot           TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by_employee_id_snapshot TEXT;
