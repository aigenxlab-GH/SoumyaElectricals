-- Owner is seeded via migration only — never via the UI
-- Replace the placeholder values before running in production
-- The auth user must be created in Supabase Auth before this runs,
-- or use Supabase Admin API to create it with the same UUID.

-- Step 1: Create the auth user via Supabase Admin API (out-of-band)
-- Step 2: Insert the users row referencing the auth user's UUID

-- This migration is intentionally left as a template.
-- Fill in the real UUID and run once during initial production setup.

-- INSERT INTO users (id, employee_id, full_name, role, sex, date_of_birth, date_of_joining, aadhaar, is_default_password)
-- VALUES (
--   'replace-with-supabase-auth-user-uuid',
--   'SE_5000',
--   'Owner Name',
--   'owner',
--   'male',
--   '1980-01-01',
--   '2020-01-01',
--   '000000000000',
--   false
-- );

-- INSERT INTO leave_balance (user_id, total_credited, used, remaining)
-- VALUES ('replace-with-supabase-auth-user-uuid', 21, 0, 21);
