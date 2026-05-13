/**
 * reset-app-data.mjs
 *
 * One-shot reset: wipes ALL application data and seeds a single Owner.
 * Uses Supabase Admin API for auth user creation (handles bcrypt + identity
 * rows correctly, which pure SQL cannot).
 *
 * Owner created:
 *   Employee ID : SE_5000
 *   Password    : 12345678  (is_default_password=TRUE → forced change on login)
 *   Full Name   : Satish Kumar Kashyap
 *   Email       : satish.kashyap@soumya.com
 *   Phone       : 8989898989
 *
 * Keeps intact: system_config, holidays
 *
 * HOW TO RUN
 * ----------
 *   cd backend
 *   node scripts/reset-app-data.mjs
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from backend/.env.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OWNER = {
  employee_id: 'SE_5000',
  email_auth:  'SE_5000@soumyaelectricals.internal',     // synthetic email for Supabase Auth
  password:    '12345678',
  full_name:   'Satish Kumar Kashyap',
  sex:         'male',
  dob:         '1975-06-15',
  doj:         '2015-01-01',
  phone:       '8989898989',
  email_real:  'satish.kashyap@soumya.com',
  address:     'HOUSE NO. 27, Shreeji Madhuban Colony, Amlihdih, Mahaveer Nagar, Raipur, Chhattisgarh 492006, India',
}

async function step(label, fn) {
  process.stdout.write(`  ${label}... `)
  try { await fn(); console.log('✓') }
  catch (err) { console.log('✗\n'); throw err }
}

async function run() {
  console.log('\n🗑️  RESETTING APPLICATION DATA\n')

  // ── 1. Wipe transactional data (FK-safe order) ──────────────────────────
  const wipeTables = [
    'quotation_items', 'quotations',
    'inventory_forecast', 'inventory', 'products',
    'overtime', 'leaves', 'timecards', 'leave_balance',
    'users',
  ]
  for (const t of wipeTables) {
    await step(`clear ${t}`, async () => {
      const { error } = await supabase.from(t).delete().gte('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw new Error(error.message)
    })
  }

  // ── 2. Wipe auth.users — must be done manually in SQL editor ────────────
  console.log('\n  ⚠️  Pre-step required: run this in Supabase SQL Editor FIRST,')
  console.log('     then re-run this script. (Admin API listUsers errors on partial rows.)')
  console.log('     ──────────────────────────────────────────────────────────')
  console.log('     DELETE FROM auth.identities;')
  console.log('     DELETE FROM auth.sessions;')
  console.log('     DELETE FROM auth.refresh_tokens;')
  console.log('     DELETE FROM auth.users;')
  console.log('     ALTER SEQUENCE product_code_seq   RESTART WITH 1;')
  console.log('     ALTER SEQUENCE quotation_code_seq RESTART WITH 1;')
  console.log('     ALTER SEQUENCE employee_id_seq    RESTART WITH 5001;')
  console.log('     ──────────────────────────────────────────────────────────\n')

  // Try once via admin API as a probe — if it fails, halt and ask user to run SQL
  const probe = await supabase.auth.admin.listUsers({ perPage: 1 })
  if (probe.error) {
    console.log('  ❌  Auth table is in a bad state. Run the SQL block above in Supabase')
    console.log('       SQL Editor, then re-run this script.\n')
    return
  }
  await step('clear auth.users via admin API', async () => {
    let page = 1
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100, page })
      if (error) throw new Error(error.message)
      if (!data.users.length) break
      for (const u of data.users) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id)
        if (delErr) throw new Error(`deleting ${u.email}: ${delErr.message}`)
      }
      if (data.users.length < 100) break
      page++
    }
  })

  // ── 4. Create the Owner via Supabase Admin API ──────────────────────────
  console.log('👤 SEEDING OWNER\n')

  let ownerId
  await step('create auth user', async () => {
    const { data, error } = await supabase.auth.admin.createUser({
      email: OWNER.email_auth,
      password: OWNER.password,
      email_confirm: true,
      user_metadata: { employee_id: OWNER.employee_id },
    })
    if (error) throw new Error(error.message)
    ownerId = data.user.id
  })

  try {
    await step('insert public.users row', async () => {
      const { error } = await supabase.from('users').insert({
        id: ownerId,
        employee_id: OWNER.employee_id,
        full_name:   OWNER.full_name,
        role:        'owner',
        sex:         OWNER.sex,
        date_of_birth:   OWNER.dob,
        date_of_joining: OWNER.doj,
        aadhaar:     '000000000000',    // placeholder — aadhaar is NOT NULL UNIQUE
        manager_id:  null,
        is_active:   true,
        is_default_password: true,      // forced password change on first login
        phone:       OWNER.phone,
        address:     OWNER.address,
        email:       OWNER.email_real,
      })
      if (error) throw new Error(error.message)
    })
  } catch (err) {
    // Rollback the orphan auth user so re-running this script works cleanly
    console.log(`     ↳ rolling back orphan auth user ${ownerId}...`)
    await supabase.auth.admin.deleteUser(ownerId).catch(() => {})
    throw err
  }

  await step('insert leave_balance row (0 days)', async () => {
    const { error } = await supabase.from('leave_balance').insert({
      user_id: ownerId,
      total_credited: 0,
      used: 0,
      remaining: 0,
    })
    if (error) throw new Error(error.message)
  })

  // ── 5. Verify ───────────────────────────────────────────────────────────
  console.log('\n🔍 VERIFICATION\n')
  const { data: owner } = await supabase.from('users').select('*').eq('employee_id', 'SE_5000').single()
  console.log('   Owner row:')
  console.log(`     employee_id          = ${owner.employee_id}`)
  console.log(`     full_name            = ${owner.full_name}`)
  console.log(`     role                 = ${owner.role}`)
  console.log(`     is_active            = ${owner.is_active}`)
  console.log(`     is_default_password  = ${owner.is_default_password}  ← must change on first login`)
  console.log(`     auth UUID            = ${owner.id}`)

  console.log('\n' + '═'.repeat(60))
  console.log('✅  RESET COMPLETE')
  console.log('═'.repeat(60))
  console.log(`\n  Sign in with:`)
  console.log(`    Employee ID : ${OWNER.employee_id}`)
  console.log(`    Password    : ${OWNER.password}`)
  console.log(`\n  (App will force a password change on first login.)\n`)
  console.log('  Don\'t forget to run the sequence-reset SQL in Supabase!\n')
}

run().catch((err) => { console.error('\n❌  ERROR:', err.message); process.exit(1) })
