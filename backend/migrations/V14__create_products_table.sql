-- V14: Products table with auto-increment product code sequence

CREATE SEQUENCE IF NOT EXISTS product_code_seq START 1 NO CYCLE;

CREATE TABLE IF NOT EXISTS products (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code  TEXT        UNIQUE NOT NULL,
  name          TEXT        UNIQUE NOT NULL,
  specification TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'Electrode',
  cost_price    NUMERIC(10,2) NOT NULL CHECK (cost_price > 0),
  selling_price NUMERIC(10,2) NOT NULL CHECK (selling_price >= cost_price),
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by    UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
