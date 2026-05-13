-- ============================================================================
--  wipe-products.sql
--  Deletes ALL product / inventory / quotation data and resets code sequences.
--  Leaves users, holidays, system_config, timecards, leaves, overtime untouched.
--
--  HOW TO RUN
--  ----------
--  Option A (recommended):
--    1. Open Supabase Dashboard → SQL Editor → New query
--    2. Paste the entire contents of this file
--    3. Click Run
--
--  Option B (psql, if installed locally):
--    psql "$DATABASE_URL" -f backend/scripts/wipe-products.sql
-- ============================================================================

BEGIN;
  -- FK-safe delete order. quotation_items also CASCADE-deletes with quotations,
  -- but we explicit it for clarity and to avoid relying on schema details.
  DELETE FROM quotation_items;
  DELETE FROM quotations;
  DELETE FROM inventory_forecast;
  DELETE FROM inventory;
  DELETE FROM products;

  -- Restart code sequences so next Product / Quotation starts at 001 / 0000001
  ALTER SEQUENCE product_code_seq   RESTART WITH 1;
  ALTER SEQUENCE quotation_code_seq RESTART WITH 1;
COMMIT;

-- Verify all 5 tables are empty. Expected: 5 rows, every "rows" = 0.
SELECT 'products'           AS table_name, COUNT(*) AS rows FROM products
UNION ALL SELECT 'inventory',           COUNT(*) FROM inventory
UNION ALL SELECT 'inventory_forecast',  COUNT(*) FROM inventory_forecast
UNION ALL SELECT 'quotations',          COUNT(*) FROM quotations
UNION ALL SELECT 'quotation_items',     COUNT(*) FROM quotation_items;
