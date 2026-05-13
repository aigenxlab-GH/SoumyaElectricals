-- ============================================================================
--  V25 — Yearly leave balance with carryover (cap 30) and negative write-off
--
--  Replaces V24's "lifetime cumulative" formula with a per-calendar-year model
--  per business rules:
--    • Owner sets `annual_leave_days` each December for the next year
--    • Every month each active employee/manager gets FLOOR(annual_leave_days/12)
--    • At year-end (Dec 31), unused balance carries forward — CAPPED AT 30
--    • Negative balance (over-used) is written off (assumed settled via payroll
--      out-of-band); remaining is never displayed below 0
--    • Fresh start from 2026-01-01 — joins before that are clamped to 2026-01-01
--    • Mid-year joiners credited only for months from join-month to year-end
--
--  Example (annual=24, monthly=2):
--    Sanjay joined April 2026, today is May 2026:
--      year 2026: effective_start=2026-04-01
--        months credited = May - April + 1 = 2
--        year_credit = 2 × 2 = 4
--        carryover_in = 0 (no prior year)
--        total_credited = 4
--      → remaining = MAX(0, 4 - used_in_2026)
--
--    Owner joined 2015-01-01, today is May 2026:
--      effective_start = MAX(2015-01-01, 2026-01-01) = 2026-01-01
--      year 2026: months = 5, year_credit = 10, carryover = 0, total_credited = 10
--
--  USAGE
--    SELECT recompute_leave_balance('<user-uuid>');
--    SELECT recompute_all_leave_balances();
-- ============================================================================

CREATE OR REPLACE FUNCTION recompute_leave_balance(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_join             DATE;
  v_today            DATE := CURRENT_DATE;
  v_effective_start  DATE;
  v_monthly_credit   INT;
  v_carryover_cap    CONSTANT INT := 30;
  v_target_year      INT := EXTRACT(YEAR  FROM v_today)::INT;
  v_target_month     INT := EXTRACT(MONTH FROM v_today)::INT;
  v_eff_year         INT;
  v_eff_month        INT;
  v_year             INT;
  v_start_month      INT;
  v_end_month        INT;
  v_months_in_year   INT;
  v_year_credit      INT;
  v_total_avail      INT;
  v_used_in_year     INT;
  v_year_remaining   INT;
  v_carryover        INT := 0;
  v_final_credited   INT := 0;
  v_final_used       INT := 0;
BEGIN
  SELECT date_of_joining INTO v_join FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Fresh-start: ignore service prior to 2026-01-01
  v_effective_start := GREATEST(v_join, DATE '2026-01-01');

  -- If user hasn't joined yet (or fresh-start is in the future), zero them out
  IF v_today < v_effective_start THEN
    UPDATE leave_balance
    SET total_credited = 0, used = 0, remaining = 0, updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  SELECT FLOOR(annual_leave_days / 12.0)::INT
    INTO v_monthly_credit
    FROM system_config LIMIT 1;
  v_monthly_credit := COALESCE(v_monthly_credit, 0);

  v_eff_year  := EXTRACT(YEAR  FROM v_effective_start)::INT;
  v_eff_month := EXTRACT(MONTH FROM v_effective_start)::INT;

  -- Walk each calendar year from effective_start.year through today's year
  FOR v_year IN v_eff_year .. v_target_year LOOP
    v_start_month := CASE WHEN v_year = v_eff_year     THEN v_eff_month     ELSE 1 END;
    v_end_month   := CASE WHEN v_year = v_target_year  THEN v_target_month  ELSE 12 END;
    v_months_in_year := v_end_month - v_start_month + 1;
    IF v_months_in_year < 0 THEN v_months_in_year := 0; END IF;

    v_year_credit := v_months_in_year * v_monthly_credit;
    v_total_avail := v_carryover + v_year_credit;

    -- Count approved leaves taken in this calendar year (only approved status counts toward used)
    SELECT COUNT(*)::INT
      INTO v_used_in_year
      FROM leaves
      WHERE user_id = p_user_id
        AND status  = 'approved'
        AND EXTRACT(YEAR FROM date) = v_year;

    IF v_year < v_target_year THEN
      -- Past year: compute carryover for next year
      v_year_remaining := GREATEST(0, v_total_avail - v_used_in_year);
      v_carryover := LEAST(v_carryover_cap, v_year_remaining);
    ELSE
      -- Current year: store these values on leave_balance
      v_final_credited := v_total_avail;
      v_final_used     := v_used_in_year;
    END IF;
  END LOOP;

  UPDATE leave_balance
  SET total_credited = v_final_credited,
      used           = v_final_used,
      remaining      = GREATEST(0, v_final_credited - v_final_used),
      updated_at     = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Bulk variant for cron + one-off back-fill
CREATE OR REPLACE FUNCTION recompute_all_leave_balances()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM recompute_leave_balance(u.id)
  FROM users u
  WHERE u.is_active = TRUE;
END;
$$;

-- Reschedule pg_cron (Pro tier) to call the same idempotent recompute
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('monthly-leave-credit');
    PERFORM cron.schedule(
      'monthly-leave-credit',
      '31 18 28-31 * *',
      $cmd$ SELECT recompute_all_leave_balances(); $cmd$
    );
  END IF;
END;
$$;

-- One-off back-fill — bring every active user's balance to the new model now
SELECT recompute_all_leave_balances();
