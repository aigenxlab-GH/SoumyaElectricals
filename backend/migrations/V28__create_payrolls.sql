-- V28 — Payrolls: per-employee per-cycle (cycle = 26th prev month → 25th current month)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_status') THEN
    CREATE TYPE payroll_status AS ENUM ('draft', 'finalised', 'paid');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payrolls (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Cycle identity: year+month of the *end* of the cycle (so Apr 26 - May 25 → 2026, 5)
  period_year              INT  NOT NULL CHECK (period_year BETWEEN 2026 AND 2100),
  period_month             INT  NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_start             DATE NOT NULL,
  period_end               DATE NOT NULL,

  -- Snapshot inputs
  monthly_salary           NUMERIC(12,2) NOT NULL,
  full_period_working_days INT  NOT NULL,                    -- working days in full 26→25 cycle
  effective_working_days   INT  NOT NULL,                    -- working days *after* employee's join date
  present_days             INT  NOT NULL,
  paid_leave_days          INT  NOT NULL,
  unpaid_absent_days       INT  NOT NULL,
  overtime_hours           NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_pay             NUMERIC(12,2) NOT NULL DEFAULT 0,
  lop_from_writeoff_days   INT  NOT NULL DEFAULT 0,          -- from V26 leave write-off (period-end snapshot)
  total_lop_days           INT  NOT NULL,                    -- unpaid_absent + lop_from_writeoff
  per_day_rate             NUMERIC(12,2) NOT NULL,

  -- Computed
  earned_salary            NUMERIC(12,2) NOT NULL,
  lop_deduction            NUMERIC(12,2) NOT NULL,
  gross_pay                NUMERIC(12,2) NOT NULL,
  net_pay                  NUMERIC(12,2) NOT NULL,

  -- Snapshots for PDF/audit
  employee_name_snapshot       TEXT NOT NULL,
  employee_id_snapshot         TEXT NOT NULL,
  employee_role_snapshot       TEXT NOT NULL,
  employee_join_date_snapshot  DATE NOT NULL,

  status                   payroll_status NOT NULL DEFAULT 'draft',
  generated_by             UUID REFERENCES users(id),
  generated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalised_at             TIMESTAMPTZ,
  paid_at                  TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payrolls_user_period
  ON payrolls (user_id, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_payrolls_period
  ON payrolls (period_year DESC, period_month DESC);
