-- Update quotation code prefix from Q- to Quote-
CREATE OR REPLACE FUNCTION next_quotation_code() RETURNS TEXT AS $$
BEGIN
  RETURN 'Quote-' || LPAD(nextval('quotation_code_seq')::TEXT, 7, '0');
END;
$$ LANGUAGE plpgsql;
