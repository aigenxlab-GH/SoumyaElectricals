-- V16: Quotations and quotation_items tables

CREATE TYPE quotation_status AS ENUM
  ('draft','requested','approved','rejected','finalised','cancelled');

CREATE SEQUENCE IF NOT EXISTS quotation_code_seq START 1 NO CYCLE;

CREATE TABLE IF NOT EXISTS quotations (
  id                           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_code               TEXT             UNIQUE NOT NULL,
  client_name                  TEXT             NOT NULL,
  client_phone                 TEXT             NOT NULL,
  client_email                 TEXT             NOT NULL,
  address                      TEXT             NOT NULL,
  delivery_address             TEXT             NOT NULL,
  quotation_date               DATE             NOT NULL,
  delivery_date                DATE             NOT NULL,
  discount_pct                 NUMERIC(5,2)     NOT NULL DEFAULT 0,
  subtotal                     NUMERIC(12,2)    NOT NULL DEFAULT 0,
  discount_amount              NUMERIC(12,2)    NOT NULL DEFAULT 0,
  amount_after_discount        NUMERIC(12,2)    NOT NULL DEFAULT 0,
  gst_pct                      NUMERIC(5,2)     NOT NULL,
  gst_amount                   NUMERIC(12,2)    NOT NULL DEFAULT 0,
  final_amount                 NUMERIC(12,2)    NOT NULL DEFAULT 0,
  status                       quotation_status NOT NULL DEFAULT 'draft',
  rejection_reason             TEXT,
  created_by                   UUID             REFERENCES users(id),
  creator_name_snapshot        TEXT             NOT NULL,
  creator_employee_id_snapshot TEXT             NOT NULL,
  creator_mobile_snapshot      TEXT,
  creator_email_snapshot       TEXT,
  approved_by                  UUID             REFERENCES users(id),
  approved_at                  TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id           UUID         NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id             UUID         REFERENCES products(id),
  product_name_snapshot  TEXT         NOT NULL,
  selling_price_snapshot NUMERIC(10,2) NOT NULL,
  quantity               INTEGER      NOT NULL CHECK (quantity > 0),
  total_price            NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
