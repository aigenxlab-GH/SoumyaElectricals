-- V27 — Salary history (effective-dated, supports raises)
CREATE TABLE IF NOT EXISTS salary_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_salary  NUMERIC(12,2) NOT NULL CHECK (monthly_salary > 0),
  effective_from  DATE NOT NULL,
  note            TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_salary_history_user_date
  ON salary_history (user_id, effective_from DESC);

-- Return the monthly salary applicable for user U on date D.
-- Picks the most recent salary record with effective_from <= D.
-- Returns NULL if no record exists (treat as 0 in payroll).
CREATE OR REPLACE FUNCTION get_salary_at(p_user_id UUID, p_at_date DATE)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT monthly_salary
  FROM salary_history
  WHERE user_id = p_user_id
    AND effective_from <= p_at_date
  ORDER BY effective_from DESC
  LIMIT 1;
$$;
