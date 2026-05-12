-- V15: Inventory and inventory_forecast tables

CREATE TABLE IF NOT EXISTS inventory (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID        UNIQUE NOT NULL REFERENCES products(id),
  total_qty     INTEGER     NOT NULL DEFAULT 0,
  available_qty INTEGER     NOT NULL DEFAULT 0,
  reserved_qty  INTEGER     NOT NULL DEFAULT 0,
  consumed_qty  INTEGER     NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_forecast (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID        NOT NULL REFERENCES products(id),
  forecast_date DATE        NOT NULL,
  qty_added     INTEGER     NOT NULL CHECK (qty_added > 0),
  created_by    UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_forecast_product_date
  ON inventory_forecast(product_id, forecast_date);
