-- V24 — Idempotent leave-balance recompute
--
-- Replaces the additive monthly cron with a back-fill formula. Running this
-- function once a day, once a month, or never (then once on login) all
-- converge to the same correct value, so we don't depend on pg_cron firing.
--
-- Formula:
--   months_since_join = (year_now - year_join) * 12 + (month_now - month_join) + 1
--   expected_total    = months_since_join * FLOOR(annual_leave_days / 12)
--   total_credited    = MAX(existing, expected_total)         -- never go backwards
--   remaining         = total_credited - used
--
-- Example: Sanjay joined April 2026, today is May 2026:
--   months = (2026-2026)*12 + (5-4) + 1 = 2
--   expected_total = 2 * FLOOR(24/12) = 2 * 2 = 4   ✓

CREATE OR REPLACE FUNCTION recompute_leave_balance(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_join           DATE;
  v_today          DATE := CURRENT_DATE;
  v_months         INTEGER;
  v_monthly_credit INTEGER;
  v_expected_total INTEGER;
BEGIN
  SELECT date_of_joining INTO v_join FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_months := GREATEST(
    1,
    (EXTRACT(YEAR  FROM v_today)::INT - EXTRACT(YEAR  FROM v_join)::INT) * 12
    + (EXTRACT(MONTH FROM v_today)::INT - EXTRACT(MONTH FROM v_join)::INT)
    + 1
  );

  SELECT FLOOR(annual_leave_days / 12.0)::INTEGER
    INTO v_monthly_credit
    FROM system_config LIMIT 1;

  v_expected_total := v_months * COALESCE(v_monthly_credit, 0);

  UPDATE leave_balance
  SET total_credited = GREATEST(total_credited, v_expected_total),
      remaining      = GREATEST(total_credited, v_expected_total) - COALESCE(used, 0),
      updated_at     = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Bulk variant — used by pg_cron and any catch-up batch
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

-- Replace the cron job (if pg_cron is available — i.e. Supabase Pro)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('monthly-leave-credit');
    PERFORM cron.schedule(
      'monthly-leave-credit',
      '31 18 28-31 * *',
      $cmd$ SELECT recompute_all_leave_balances(); $cmd$
    );
    RAISE NOTICE 'pg_cron monthly-leave-credit now calls idempotent recompute';
  ELSE
    RAISE NOTICE 'pg_cron not available — call recompute_all_leave_balances() manually or rely on per-login recompute';
  END IF;
END;
$$;

-- One-off back-fill: bring every active user's balance up to its expected value right now
SELECT recompute_all_leave_balances();
