-- V17: Add GST rate to system_config

ALTER TABLE system_config
  ADD COLUMN IF NOT EXISTS gst_pct NUMERIC(5,2) NOT NULL DEFAULT 18;
