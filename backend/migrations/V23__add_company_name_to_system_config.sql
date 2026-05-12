ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT 'Soumya Earthing Electrodes';
