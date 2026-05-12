-- Monthly leave credit job: runs at 18:31 UTC on the last day of every month
-- This is midnight IST (UTC+5:30) on the 1st of the following month
-- Requires pg_cron extension (Supabase Pro plan); skipped gracefully on free tier

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
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
            SET total_credited = total_credited + sc.annual_leave_days,
                remaining      = remaining      + sc.annual_leave_days,
                updated_at     = NOW()
            FROM system_config sc
            JOIN users u ON u.id = lb.user_id
            WHERE u.is_active = TRUE;

          END IF;
        END;
        $body$
      $cmd$
    );
    RAISE NOTICE 'pg_cron job monthly-leave-credit scheduled';
  ELSE
    RAISE NOTICE 'pg_cron extension not found — monthly leave credit job not scheduled. Enable it on Supabase Pro to activate monthly leave credits.';
  END IF;
END;
$$;
