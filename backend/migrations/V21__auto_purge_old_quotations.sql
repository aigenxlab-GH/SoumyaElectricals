-- Auto-purge job: permanently delete rejected/cancelled quotations older than 10 days
-- Runs daily at 02:00 UTC (07:30 IST)
-- quotation_items rows are removed automatically via ON DELETE CASCADE (V16)
-- Inventory was already released at the time of rejection/cancellation — no inventory
-- adjustment needed here.
--
-- Requires pg_cron extension (Supabase Pro plan); skipped gracefully otherwise.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'daily-purge-old-quotations',
      '0 2 * * *',
      $cmd$
        DELETE FROM quotations
        WHERE status IN ('rejected', 'cancelled')
          AND updated_at < NOW() - INTERVAL '10 days';
      $cmd$
    );
    RAISE NOTICE 'pg_cron job daily-purge-old-quotations scheduled';
  ELSE
    RAISE NOTICE 'pg_cron extension not found — daily quotation purge job not scheduled.';
  END IF;
END;
$$;
