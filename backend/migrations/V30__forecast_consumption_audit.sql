-- V30 — Per-week forecast consumption audit for quotation items
-- ===================================================================
-- BEFORE: Reservations only updated inventory.reserved_qty aggregate;
--         A per week was computed via complex subtraction of grouped
--         reservation totals. Forecast.qty_added represented "raw" M
--         that ignored bookings.
-- AFTER:  When a quotation is created, M for the delivery week (and
--         earlier weeks if needed) is reduced by walking backward
--         until the qty is satisfied. Each take is recorded in this
--         audit table so cancel/reject can revert exactly the same
--         rows. A per week becomes a simple forward cumulative SUM.
-- ===================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS quotation_item_consumption (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id    UUID        NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id      UUID        NOT NULL REFERENCES products(id),
  forecast_date   DATE        NOT NULL,
  qty_consumed    INTEGER     NOT NULL CHECK (qty_consumed > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_qic_quotation
  ON quotation_item_consumption(quotation_id);
CREATE INDEX IF NOT EXISTS ix_qic_product_date
  ON quotation_item_consumption(product_id, forecast_date);

-- ── Backfill ──────────────────────────────────────────────────────────────
-- For each item in active quotations (draft / requested / approved), walk
-- backward from the delivery week and decrement forecast.qty_added.
-- Process oldest-first so reservation chronology is preserved.

DO $$
DECLARE
  itm RECORD;
  rec RECORD;
  remaining INT;
  take_qty INT;
  delivery_mon DATE;
BEGIN
  FOR itm IN
    SELECT qi.quotation_id, qi.product_id, qi.quantity, q.delivery_date
    FROM   quotation_items qi
    JOIN   quotations q ON q.id = qi.quotation_id
    WHERE  q.status IN ('draft', 'requested', 'approved')
      AND  qi.product_id IS NOT NULL
    ORDER BY q.created_at
  LOOP
    -- Monday of the delivery week (DATE_TRUNC week is Monday-aligned in PG)
    delivery_mon := DATE_TRUNC('week', itm.delivery_date)::DATE;
    remaining    := itm.quantity;

    FOR rec IN
      SELECT id, forecast_date, qty_added
      FROM   inventory_forecast
      WHERE  product_id    = itm.product_id
        AND  forecast_date <= delivery_mon
        AND  qty_added     > 0
      ORDER BY forecast_date DESC
      FOR UPDATE
    LOOP
      EXIT WHEN remaining <= 0;
      take_qty := LEAST(remaining, rec.qty_added);

      UPDATE inventory_forecast
      SET    qty_added = qty_added - take_qty
      WHERE  id = rec.id;

      INSERT INTO quotation_item_consumption
        (quotation_id, product_id, forecast_date, qty_consumed)
      VALUES
        (itm.quotation_id, itm.product_id, rec.forecast_date, take_qty);

      remaining := remaining - take_qty;
    END LOOP;
    -- If remaining > 0, the quotation was already over-committed at create
    -- time (data debt). We leave it as-is — manager can resolve manually.
  END LOOP;
END $$;

-- ── Resync inventory aggregates ───────────────────────────────────────────
-- New invariant: total_qty = SUM(qty_added) + reserved_qty + consumed_qty
-- (treats total_qty as raw cumulative production; SUM(qty_added) is the
-- "available to commit" pool after current reservations.)
UPDATE inventory inv
SET    total_qty     = COALESCE(t.sum_qty, 0) + COALESCE(inv.reserved_qty, 0) + COALESCE(inv.consumed_qty, 0),
       available_qty = COALESCE(t.sum_qty, 0),
       updated_at    = NOW()
FROM (
  SELECT product_id, SUM(qty_added)::INT AS sum_qty
  FROM   inventory_forecast
  GROUP BY product_id
) t
WHERE  inv.product_id = t.product_id;

-- Products with no forecast rows: keep reserved/consumed; zero out available
UPDATE inventory inv
SET    total_qty     = COALESCE(inv.reserved_qty, 0) + COALESCE(inv.consumed_qty, 0),
       available_qty = 0,
       updated_at    = NOW()
WHERE  NOT EXISTS (
  SELECT 1 FROM inventory_forecast f WHERE f.product_id = inv.product_id
);

COMMIT;
