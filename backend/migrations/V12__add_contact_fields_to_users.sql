-- V12: Add contact fields (phone, address, email) to users table
-- These are collected at user-creation time and stored for HR reference.
-- Nullable to avoid breaking existing rows seeded before this migration.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS email   VARCHAR(255);
