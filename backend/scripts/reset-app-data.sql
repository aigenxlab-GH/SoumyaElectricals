-- ============================================================================
--  reset-app-data.sql  —  FOOLPROOF VERSION
--  Wipes ALL application data and seeds a single Owner that can log in.
--  Keeps system_config + holidays untouched.
--
--  HOW TO RUN
--  ----------
--  Supabase Dashboard → SQL Editor → New query → paste entire file → Run.
--
--  Tested against Supabase Pro/Free 2024+. Uses pgcrypto (gen_random_uuid +
--  crypt + gen_salt) which is enabled by default on every Supabase project.
-- ============================================================================

BEGIN;

  -- ── 1. Wipe transactional + user data (FK-safe order) ───────────────────
  DELETE FROM quotation_items;
  DELETE FROM quotations;
  DELETE FROM inventory_forecast;
  DELETE FROM inventory;
  DELETE FROM products;
  DELETE FROM overtime;
  DELETE FROM leaves;
  DELETE FROM timecards;
  DELETE FROM leave_balance;
  DELETE FROM users;

  -- Auth-side wipe (order matters — identities/sessions/tokens FK to users)
  DELETE FROM auth.refresh_tokens;
  DELETE FROM auth.sessions;
  DELETE FROM auth.identities;
  DELETE FROM auth.users;

  -- ── 2. Reset sequences ──────────────────────────────────────────────────
  ALTER SEQUENCE product_code_seq   RESTART WITH 1;
  ALTER SEQUENCE quotation_code_seq RESTART WITH 1;
  ALTER SEQUENCE employee_id_seq    RESTART WITH 5001;

  -- ── 3. Create Owner via DO block (so we can reuse one UUID across 4 tables) ─
  DO $$
  DECLARE
    v_id    uuid := gen_random_uuid();
    v_email text := 'se_5000@soumyaelectricals.internal';   -- MUST be lowercase
                                                            -- (GoTrue lowercases the
                                                            -- email on login lookup)
  BEGIN
    -- 3a. auth.users
    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      created_at, updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated', 'authenticated',
      v_email,
      crypt('12345678', gen_salt('bf', 10)),   -- bcrypt cost 10, GoTrue-compatible
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '', '',          -- empty strings; GoTrue rejects NULL on these
      '', '',
      NOW(), NOW()
    );

    -- 3b. auth.identities  ← THE STEP YOUR ORIGINAL SQL WAS MISSING
    -- Without this row, signInWithPassword returns "Invalid login credentials"
    -- even when the password hash is correct.
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email',
      v_id::text,
      NOW(), NOW(), NOW()
    );

    -- 3c. public.users
    INSERT INTO public.users (
      id, employee_id, full_name, role, sex,
      date_of_birth, date_of_joining,
      aadhaar, manager_id, is_active, is_default_password,
      phone, address, email,
      created_at, updated_at
    )
    VALUES (
      v_id,
      'SE_5000',
      'Satish Kumar Kashyap',
      'owner', 'male',
      '1975-06-15'::DATE, '2015-01-01'::DATE,
      '123412341234',          -- aadhaar (TEXT, 12 digits, NOT NULL UNIQUE)
      NULL,                    -- manager_id (owner has no manager)
      TRUE,                    -- is_active
      TRUE,                    -- is_default_password → forces change on first login
      '8989898989',
      'HOUSE NO. 27, Shreeji Madhuban Colony, Amlihdih, Mahaveer Nagar, Raipur, Chhattisgarh 492006, India',
      'satish.kashyap@soumya.com',
      NOW(), NOW()
    );

    -- 3d. leave_balance (0 days — owner doesn't take leave)
    INSERT INTO leave_balance (
      id, user_id, total_credited, used, remaining, updated_at
    )
    VALUES (
      gen_random_uuid(), v_id, 0, 0, 0, NOW()
    );

  END $$;

COMMIT;

-- ── 4. Verify  (should return 1 row with all the right fields) ─────────────
SELECT
  u.employee_id,
  u.full_name,
  u.role,
  u.is_active,
  u.is_default_password               AS must_change_password,
  au.email                            AS auth_email_lowercased,
  i.provider                          AS identity_provider,
  CASE WHEN au.encrypted_password ~ '^\$2[aby]\$' THEN 'bcrypt ✓' ELSE 'BAD HASH ✗' END AS pw_format
FROM public.users u
JOIN auth.users au   ON au.id      = u.id
JOIN auth.identities i ON i.user_id = u.id
WHERE u.employee_id = 'SE_5000';

-- ── 5. Empty-state sanity check ─────────────────────────────────────────────
SELECT 'users (excl owner)'   AS table_name, COUNT(*) FROM public.users WHERE employee_id <> 'SE_5000'
UNION ALL SELECT 'products',           COUNT(*) FROM products
UNION ALL SELECT 'inventory',          COUNT(*) FROM inventory
UNION ALL SELECT 'inventory_forecast', COUNT(*) FROM inventory_forecast
UNION ALL SELECT 'quotations',         COUNT(*) FROM quotations
UNION ALL SELECT 'quotation_items',    COUNT(*) FROM quotation_items
UNION ALL SELECT 'timecards',          COUNT(*) FROM timecards
UNION ALL SELECT 'leaves',             COUNT(*) FROM leaves
UNION ALL SELECT 'overtime',           COUNT(*) FROM overtime;
