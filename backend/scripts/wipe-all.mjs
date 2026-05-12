/**
 * wipe-all.mjs
 * Deletes ALL data from the database — transactional data, users, holidays, auth users.
 * Leaves system_config intact (rates and annual leave days).
 *
 * Run: node backend/scripts/wipe-all.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://mafdakbwchpmqqihpnbb.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZmRha2J3Y2hwbXFxaWhwbmJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2ODc4MywiZXhwIjoyMDkzODQ0NzgzfQ.BYnGfuhFdgak2Uml0nXPF4Qjw57xUuYMjdZnQlJcnEc'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function wipeAll() {
  console.log('\n🗑️  Wiping ALL database data...\n')

  // 1. Transactional tables (leave_balance has no created_at — use user_id filter)
  for (const table of ['timecards', 'overtime', 'leaves']) {
    const { error } = await supabase.from(table).delete().gte('created_at', '2000-01-01')
    if (error) console.warn(`  ⚠️  ${table}: ${error.message}`)
    else        console.log(`  ✓ cleared ${table}`)
  }
  // leave_balance uses user_id (UUID) — delete all rows differently
  const { error: lbErr } = await supabase.from('leave_balance').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
  if (lbErr) console.warn(`  ⚠️  leave_balance: ${lbErr.message}`)
  else        console.log('  ✓ cleared leave_balance')

  // 2. Users table
  const { error: usersErr } = await supabase.from('users').delete().gte('created_at', '2000-01-01')
  if (usersErr) console.warn(`  ⚠️  users: ${usersErr.message}`)
  else          console.log('  ✓ cleared users')

  // 3. Holidays
  const { error: holErr } = await supabase.from('holidays').delete().gte('date', '1900-01-01')
  if (holErr) console.warn(`  ⚠️  holidays: ${holErr.message}`)
  else        console.log('  ✓ cleared holidays')

  // 4. Supabase Auth users
  const { data: authList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) {
    console.warn(`  ⚠️  Could not list auth users: ${listErr.message}`)
  } else {
    console.log(`\n  Deleting ${authList.users.length} auth user(s)...`)
    for (const u of authList.users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id)
      if (delErr) console.warn(`    ⚠️  ${u.email}: ${delErr.message}`)
      else        process.stdout.write('.')
    }
    console.log(`\n  ✓ cleared auth users`)
  }

  console.log('\n' + '═'.repeat(50))
  console.log('✅  WIPE COMPLETE — database is now empty')
  console.log('    system_config (rates & leave days) preserved')
  console.log('═'.repeat(50) + '\n')
}

wipeAll().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1) })
