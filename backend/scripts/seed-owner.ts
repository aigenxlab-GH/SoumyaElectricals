/**
 * One-time script to seed the owner user.
 * Run ONCE after all Flyway migrations have been applied:
 *   cd backend
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/seed-owner.ts
 *
 * Or on Windows PowerShell:
 *   $env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; npx ts-node scripts/seed-owner.ts
 *
 * Optional overrides: OWNER_PASSWORD, OWNER_FULL_NAME, OWNER_AADHAAR, OWNER_SEX, OWNER_DOB, OWNER_DOJ
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment')
  process.exit(1)
}

// Edit these before running
const OWNER_EMPLOYEE_ID = 'SE_5000'
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'SE_5000@soumyaelectricals.internal'
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? 'ChangeMe@2024!'
const OWNER_FULL_NAME = process.env.OWNER_FULL_NAME ?? 'Soumya Electricals Owner'
const OWNER_AADHAAR = process.env.OWNER_AADHAAR ?? '000000000000'
const OWNER_SEX = process.env.OWNER_SEX ?? 'male'
const OWNER_DOB = process.env.OWNER_DOB ?? '1980-01-01'
const OWNER_DOJ = process.env.OWNER_DOJ ?? '2020-01-01'
const ANNUAL_LEAVE_DAYS = 21

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ORPHANED_AUTH_ID = process.env.ORPHANED_AUTH_ID

async function main() {
  // Clean up orphaned auth user from a previous failed run if provided
  if (ORPHANED_AUTH_ID) {
    console.log(`Deleting orphaned auth user ${ORPHANED_AUTH_ID}...`)
    const { error } = await supabase.auth.admin.deleteUser(ORPHANED_AUTH_ID)
    if (error) console.warn('Could not delete orphaned user:', error.message)
    else console.log('Orphaned auth user deleted.')
  }

  console.log('Creating owner auth user...')

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
    user_metadata: { employee_id: OWNER_EMPLOYEE_ID },
  })

  if (authError) {
    console.error('Failed to create auth user:', authError.message)
    process.exit(1)
  }

  const authUserId = authData.user.id
  console.log(`Auth user created: ${authUserId}`)

  console.log('Inserting owner into users table...')
  const { error: userError } = await supabase.from('users').insert({
    id: authUserId,
    employee_id: OWNER_EMPLOYEE_ID,
    full_name: OWNER_FULL_NAME,
    role: 'owner',
    sex: OWNER_SEX,
    date_of_birth: OWNER_DOB,
    date_of_joining: OWNER_DOJ,
    aadhaar: OWNER_AADHAAR,
    is_default_password: false,
  })

  if (userError) {
    console.error('Failed to insert user row:', userError.message)
    console.error('Auth user was created — delete it from Supabase Auth before retrying')
    process.exit(1)
  }

  console.log('Inserting leave balance...')
  const { error: balanceError } = await supabase.from('leave_balance').insert({
    user_id: authUserId,
    total_credited: ANNUAL_LEAVE_DAYS,
    used: 0,
    remaining: ANNUAL_LEAVE_DAYS,
  })

  if (balanceError) {
    console.error('Failed to insert leave_balance row:', balanceError.message)
    process.exit(1)
  }

  console.log('\nOwner seeded successfully!')
  console.log(`  Employee ID : ${OWNER_EMPLOYEE_ID}`)
  console.log(`  Auth UUID   : ${authUserId}`)
  console.log(`  Email       : ${OWNER_EMAIL}`)
  console.log(`  Password    : ${OWNER_PASSWORD}`)
  console.log('\nStore these credentials securely — they cannot be recovered from the DB.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
