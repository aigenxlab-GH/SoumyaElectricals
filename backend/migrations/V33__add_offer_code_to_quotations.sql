-- V33: Add offer code to quotations
-- When a quotation is finalised it becomes an Offer; a unique sequential
-- offer code (Offer-0000001) is generated and stored alongside the quotation code.

CREATE SEQUENCE IF NOT EXISTS offer_code_seq START 1 NO CYCLE;

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS offer_code TEXT UNIQUE;

-- Helper function used by the backend to generate the next offer code
CREATE OR REPLACE FUNCTION next_offer_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'Offer-' || LPAD(nextval('offer_code_seq')::text, 7, '0');
END;
$$;
