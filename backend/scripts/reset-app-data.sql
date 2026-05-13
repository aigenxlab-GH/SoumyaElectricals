-- ============================================================================
--  reset-app-data.sql
--  Nukes ALL application data (transactional + users) and seeds a single
--  Owner user: Satish Kumar Kashyap (SE_5000) with password "12345678".
--  Leaves system_config + holidays intact.
--
--  HOW TO RUN
--  ----------
--  Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--
--  ⚠️  IRREVERSIBLE. Run only on a database you intend to reset to zero.
-- ============================================================================

BEGIN;

  -- ── 1. Wipe transactional data (FK-safe order) ──────────────────────────
  DELETE FROM quotation_items;
  DELETE FROM quotations;
  DELETE FROM inventory_forecast;
  DELETE FROM inventory;
  DELETE FROM products;
  DELETE FROM overtime;
  DELETE FROM leaves;
  DELETE FROM timecards;
  DELETE FROM leave_balance;
  DELETE FROM users;          -- public.users
  DELETE FROM auth.users;     -- Supabase Auth (cascade-removes orphaned sessions/identities)

  -- ── 2. Reset all sequences ──────────────────────────────────────────────
  ALTER SEQUENCE product_code_seq   RESTART WITH 1;
  ALTER SEQUENCE quotation_code_seq RESTART WITH 1;
  -- employee_id_seq starts at 5000 — next call to nextval() returns 5001.
  -- We hardcode the owner as SE_5000 below, so leave the sequence at 5000
  -- which means the next UI-created user will be SE_5001.
  ALTER SEQUENCE employee_id_seq    RESTART WITH 5001;

  -- ── 3. Create the Owner auth user + matching public.users row ───────────
  -- We mint a fixed UUID once and use it in both tables.
  WITH new_auth_user AS (
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'SE_5000@soumyaelectricals.internal',
      crypt('12345678', gen_salt('bf', 10)),  -- bcrypt cost 10, Supabase-compatible
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id
  )
  INSERT INTO public.users (
    id,
    employee_id,
    full_name,
    role,
    sex,
    date_of_birth,
    date_of_joining,
    aadhaar,
    manager_id,
    is_active,
    is_default_password,
    phone,
    address,
    email,
    created_at,
    updated_at
  )
  SELECT
    id,
    'SE_5000',
    'Satish Kumar Kashyap',
    'owner',
    'male',
    '1975-06-15'::DATE,
    '2015-01-01'::DATE,
    NULL,                                    -- aadhaar (optional)
    NULL,                                    -- manager_id (owner has no manager)
    TRUE,                                    -- is_active
    TRUE,                                    -- is_default_password → forces change on first login
    '8989898989',
    'HOUSE NO. 27, Shreeji Madhuban Colony, Amlihdih, Mahaveer Nagar, Raipur, Chhattisgarh 492006, India',
    'satish.kashyap@soumya.com',
    NOW(),
    NOW()
  FROM new_auth_user;

  -- ── 4. Seed leave_balance for the owner (0 days; owner doesn't take leave) ─
  INSERT INTO leave_balance (id, user_id, total_credited, used, remaining, updated_at)
  SELECT gen_random_uuid(), id, 0, 0, 0, NOW()
  FROM public.users
  WHERE employee_id = 'SE_5000';

COMMIT;

-- ── 5. Verify ───────────────────────────────────────────────────────────────
-- Should return 1 row showing the owner is set up correctly.
SELECT
  u.employee_id,
  u.full_name,
  u.role,
  u.is_active,
  u.is_default_password AS must_change_password_on_first_login,
  u.phone,
  u.email,
  au.email AS auth_email
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.employee_id = 'SE_5000';

-- Should return all zeros (everything else is empty).
SELECT 'users (excl owner)'   AS table_name, COUNT(*) FROM public.users WHERE employee_id <> 'SE_5000'
UNION ALL SELECT 'products',           COUNT(*) FROM products
UNION ALL SELECT 'inventory',          COUNT(*) FROM inventory
UNION ALL SELECT 'inventory_forecast', COUNT(*) FROM inventory_forecast
UNION ALL SELECT 'quotations',         COUNT(*) FROM quotations
UNION ALL SELECT 'quotation_items',    COUNT(*) FROM quotation_items
UNION ALL SELECT 'timecards',          COUNT(*) FROM timecards
UNION ALL SELECT 'leaves',             COUNT(*) FROM leaves
UNION ALL SELECT 'overtime',           COUNT(*) FROM overtime;
