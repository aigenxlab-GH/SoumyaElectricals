-- V10: Fix monthly leave credit — credit FLOOR(annual_leave_days / 12) per month
-- V6 incorrectly credited the full annual_leave_days every month.
-- This migration drops the old job and recreates it with the correct per-month amount.
-- Must be applied manually via Supabase SQL editor (Flyway cannot connect to remote Supabase).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- Remove the incorrectly configured cron job from V6
    PERFORM cron.unschedule('monthly-leave-credit');

    -- Recreate with correct monthly credit: FLOOR(annual_leave_days / 12)
    -- Schedule: 18:31 UTC on days 28–31 (last day of month = midnight IST on 1st)
    PERFORM cron.schedule(
      'monthly-leave-credit',
      '31 18 28-31 * *',
      $cmd$
        DO $body$
        BEGIN
          -- Only run on the actual last day of the month
          IF EXTRACT(DAY FROM (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')) =
             EXTRACT(DAY FROM NOW()) THEN

            UPDATE leave_balance lb
            SET total_credited = total_credited + FLOOR(sc.annual_leave_days / 12.0)::INTEGER,
                remaining      = remaining      + FLOOR(sc.annual_leave_days / 12.0)::INTEGER,
                updated_at     = NOW()
            FROM system_config sc
            JOIN users u ON u.id = lb.user_id
            WHERE u.is_active = TRUE;

          END IF;
        END;
        $body$
      $cmd$
    );

    RAISE NOTICE 'pg_cron job monthly-leave-credit updated — now credits FLOOR(annual_leave_days/12) per month';
  ELSE
    RAISE NOTICE 'pg_cron extension not found — skipping cron job update';
  END IF;
END;
$$;
