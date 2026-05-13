// Reset all test user passwords back to Soumya@2024
// Run: node backend/scripts/reset-test-passwords.mjs

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env')
  process.exit(1)
}
const PASSWORD = 'Soumya@2024'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Employee IDs to reset (SE_5001 through SE_5015)
const empIds = Array.from({ length: 15 }, (_, i) => `SE_${5001 + i}`)

console.log(`Resetting passwords for ${empIds.length} test users...\n`)

let success = 0, errors = 0
for (const empId of empIds) {
  const email = `${empId.toLowerCase()}@soumyaelectricals.internal`

  // Find auth user by email
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) { console.error('Error listing users:', listErr.message); break }

  const authUser = users.users.find(u => u.email === email)
  if (!authUser) {
    console.log(`⚠️  ${empId} — auth user not found`)
    continue
  }

  // Update password
  const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
    password: PASSWORD
  })

  if (updateErr) {
    console.log(`❌ ${empId} — ${updateErr.message}`)
    errors++
  } else {
    console.log(`✅ ${empId} — password reset`)
    success++
  }
}

console.log(`\nDone: ${success} reset, ${errors} errors`)
