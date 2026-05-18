-- V29 — switch inventory_forecast from additive-rows model to one-row-per-week
-- ===========================================================================
-- BEFORE: every save inserted a new row; display logic summed them.
--          User typing "9" over an existing 10 produced 19 in the data.
-- AFTER:  exactly one row per (product_id, forecast_date). Each save UPSERTs.
--         User typing "9" replaces the stored value to 9.
--
-- Also: allow qty_added = 0 so a cell can be reset to zero explicitly.
-- ===========================================================================

BEGIN;

  -- 1. Collapse existing duplicates: keep one row per (product, date) with the
  --    SUM of the duplicates (preserves user's effective values).
  CREATE TEMP TABLE _inv_snap AS
  SELECT
    product_id,
    forecast_date,
    SUM(qty_added)::INT AS qty_added,
    MAX(created_at)     AS created_at,
    (array_agg(created_by ORDER BY created_at DESC NULLS LAST))[1] AS created_by
  FROM inventory_forecast
  GROUP BY product_id, forecast_date;

  DELETE FROM inventory_forecast;

  INSERT INTO inventory_forecast (product_id, forecast_date, qty_added, created_by, created_at)
  SELECT product_id, forecast_date, qty_added, created_by, created_at
  FROM _inv_snap;

  -- 2. Drop CHECK (qty_added > 0) — replace with >= 0 so 0 is valid.
  ALTER TABLE inventory_forecast
    DROP CONSTRAINT IF EXISTS inventory_forecast_qty_added_check;
  ALTER TABLE inventory_forecast
    ADD CONSTRAINT inventory_forecast_qty_added_check CHECK (qty_added >= 0);

  -- 3. UNIQUE per (product, date) so saveForecast can UPSERT.
  ALTER TABLE inventory_forecast
    ADD CONSTRAINT inventory_forecast_unique_per_week UNIQUE (product_id, forecast_date);

  -- 4. Resync inventory.total_qty / available_qty with the new SUM of forecasts.
  --    (Old additive saves may have over-counted.)
  UPDATE inventory inv
  SET total_qty     = COALESCE(t.total, 0),
      available_qty = COALESCE(t.total, 0) - COALESCE(inv.reserved_qty, 0) - COALESCE(inv.consumed_qty, 0),
      updated_at    = NOW()
  FROM (
    SELECT product_id, SUM(qty_added)::INT AS total
    FROM inventory_forecast
    GROUP BY product_id
  ) t
  WHERE inv.product_id = t.product_id;

  -- Products with no forecast rows: zero them out
  UPDATE inventory inv
  SET total_qty     = 0,
      available_qty = -COALESCE(inv.reserved_qty, 0) - COALESCE(inv.consumed_qty, 0),
      updated_at    = NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM inventory_forecast f WHERE f.product_id = inv.product_id
  );

COMMIT;
