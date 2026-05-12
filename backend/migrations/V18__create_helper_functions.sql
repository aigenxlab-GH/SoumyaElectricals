-- V18: Helper functions for product/quotation code generation and inventory adjustment

-- Product code generator: Product-001, Product-002, …
CREATE OR REPLACE FUNCTION next_product_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Product-' || LPAD(nextval('product_code_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Quotation code generator: Q-0000001, Q-0000002, …
CREATE OR REPLACE FUNCTION next_quotation_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Q-' || LPAD(nextval('quotation_code_seq')::TEXT, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- Inventory quantity adjuster: atomically applies deltas to an inventory row
-- Upserts the row if it does not yet exist for the given product
CREATE OR REPLACE FUNCTION adjust_inventory(
  p_product_id    UUID,
  p_available_delta INTEGER,
  p_reserved_delta  INTEGER,
  p_consumed_delta  INTEGER,
  p_total_delta     INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO inventory (product_id, total_qty, available_qty, reserved_qty, consumed_qty)
  VALUES (p_product_id, p_total_delta, p_available_delta, p_reserved_delta, p_consumed_delta)
  ON CONFLICT (product_id) DO UPDATE
    SET total_qty     = inventory.total_qty     + p_total_delta,
        available_qty = inventory.available_qty + p_available_delta,
        reserved_qty  = inventory.reserved_qty  + p_reserved_delta,
        consumed_qty  = inventory.consumed_qty  + p_consumed_delta,
        updated_at    = NOW();
END;
$$ LANGUAGE plpgsql;
