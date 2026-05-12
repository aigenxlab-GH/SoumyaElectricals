-- Company branding fields used in PDFs and headers
ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS brand_name           TEXT NOT NULL DEFAULT 'Soumya Earthing Electrodes',
  ADD COLUMN IF NOT EXISTS company_address      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gstin_no             TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_email        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_phone        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_website      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS authorized_signatory TEXT NOT NULL DEFAULT '';
