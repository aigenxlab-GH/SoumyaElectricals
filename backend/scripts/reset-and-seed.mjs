/**
 * reset-and-seed.mjs
 * Wipes ALL data and creates fresh seed data with owner Satish Kashyap.
 *
 * Run: node backend/scripts/reset-and-seed.mjs
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

const DOMAIN   = 'soumyaelectricals.internal'
const PASSWORD = 'Soumya@2024'
const OWNER_PASSWORD = 'ChangeMe@2024!'
const ANNUAL_LEAVE = 24
const MONTHLY_CREDIT = Math.floor(ANNUAL_LEAVE / 12) // 2

// May 2026 work days (skip Sunday May 3, 10, 17, 24, 31)
const MAY_WORKDAYS = [
  '2026-05-01','2026-05-02',
  '2026-05-04','2026-05-05','2026-05-06','2026-05-07','2026-05-08',
  '2026-05-11','2026-05-12','2026-05-13','2026-05-14','2026-05-15',
  '2026-05-18','2026-05-19','2026-05-20','2026-05-21','2026-05-22',
]

// ─── WIPE ─────────────────────────────────────────────────────────────────────
async function wipeAll() {
  console.log('\n🗑️  Wiping all data...')

  // Delete transactional data first
  for (const table of ['timecards', 'overtime', 'leaves', 'leave_balance']) {
    const { error } = await supabase.from(table).delete().gte('created_at', '2000-01-01')
    if (error) console.warn(`  ⚠️  ${table}: ${error.message}`)
    else console.log(`  ✓ cleared ${table}`)
  }

  // Delete all users
  const { error: usersErr } = await supabase.from('users').delete().gte('created_at', '2000-01-01')
  if (usersErr) console.warn(`  ⚠️  users: ${usersErr.message}`)
  else console.log('  ✓ cleared users')

  // Delete all holidays
  const { error: holErr } = await supabase.from('holidays').delete().gte('date', '1900-01-01')
  if (holErr) console.warn(`  ⚠️  holidays: ${holErr.message}`)
  else console.log('  ✓ cleared holidays')

  // Delete all Supabase auth users
  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  console.log(`  Deleting ${authList.users.length} auth users...`)
  for (const u of authList.users) {
    await supabase.auth.admin.deleteUser(u.id)
  }
  console.log(`  ✓ cleared auth users`)

  // Reset employee_id sequence to 0
  await supabase.rpc('next_employee_id_seq') // warm up
  // Reset sequence via raw SQL isn't available directly — we'll advance it after seeding
  console.log('  ✓ wipe complete\n')
}

// ─── CREATE USER ──────────────────────────────────────────────────────────────
async function createUser({ empId, name, role, sex, dob, doj, aadhaar, managerId = null, password = PASSWORD, isDefaultPassword = false }) {
  const email = `${empId.toLowerCase()}@${DOMAIN}`

  const { data, error: authErr } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { employee_id: empId },
  })
  if (authErr) throw new Error(`Auth create failed for ${empId}: ${authErr.message}`)

  const uuid = data.user.id

  const { error: userErr } = await supabase.from('users').insert({
    id: uuid, employee_id: empId, full_name: name, role, sex,
    date_of_birth: dob, date_of_joining: doj, aadhaar,
    manager_id: managerId, is_active: true, is_default_password: isDefaultPassword,
  })
  if (userErr) throw new Error(`Users insert failed for ${empId}: ${userErr.message}`)

  // Monthly credit × months since Jan (May = 5 months)
  const monthsElapsed = 5
  const credited = role === 'owner' ? ANNUAL_LEAVE : MONTHLY_CREDIT * monthsElapsed
  const { error: balErr } = await supabase.from('leave_balance').insert({
    user_id: uuid, total_credited: credited, used: 0, remaining: credited,
  })
  if (balErr) throw new Error(`leave_balance insert failed for ${empId}: ${balErr.message}`)

  console.log(`  ✅ ${empId}  ${name.padEnd(22)} ${role}`)
  return uuid
}

// ─── INSERT TIMECARDS ─────────────────────────────────────────────────────────
async function insertTimecards(userId, dates, workLog = 'Regular electrical site work — maintenance and installation.') {
  const rows = dates.map(date => ({ user_id: userId, date, work_log: workLog, status: 'applied' }))
  const { error } = await supabase.from('timecards').insert(rows)
  if (error) throw new Error(`Timecards insert failed: ${error.message}`)
}

// ─── INSERT LEAVE ─────────────────────────────────────────────────────────────
async function insertLeave(userId, date, reason = 'Personal leave.') {
  const { error } = await supabase.from('leaves').insert({
    user_id: userId, date, reason, status: 'applied',
  })
  if (error) throw new Error(`Leave insert failed: ${error.message}`)

  await supabase.from('leave_balance')
    .update({ used: supabase.rpc, remaining: MONTHLY_CREDIT * 5 - 1 })

  // Deduct balance via RPC
  const { error: deductErr } = await supabase.rpc('deduct_leave_balance', {
    p_user_id: userId, p_days: 1
  })
  if (deductErr) {
    // Fallback: manual update
    const { data: bal } = await supabase.from('leave_balance').select('used,remaining').eq('user_id', userId).single()
    if (bal) {
      await supabase.from('leave_balance').update({
        used: (bal.used || 0) + 1, remaining: Math.max(0, (bal.remaining || 0) - 1)
      }).eq('user_id', userId)
    }
  }
}

// ─── INSERT OVERTIME ──────────────────────────────────────────────────────────
async function insertOvertime(userId, date, hours, otRate, workLog = 'Extended electrical installation work.') {
  const payout = hours * otRate
  const { error } = await supabase.from('overtime').insert({
    user_id: userId, date, hours, work_log: workLog, payout, status: 'applied',
  })
  if (error) throw new Error(`Overtime insert failed: ${error.message}`)
}

// ─── RESET SEQUENCE ───────────────────────────────────────────────────────────
async function resetSequence(target) {
  // Advance until we've called it `target` times
  for (let i = 0; i < target; i++) {
    await supabase.rpc('next_employee_id_seq')
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  await wipeAll()

  // ── Get current config for OT rates ──
  const { data: cfg } = await supabase.from('system_config').select('*').single()
  const EMP_OT_RATE = cfg?.overtime_rate_per_hour ?? 100
  const MGR_OT_RATE = cfg?.manager_overtime_rate_per_hour ?? 150

  // ── Reset sequence to 0 so SE_5000 is next ──
  // The sequence is at some high number from previous data — we can't reset it directly
  // Instead we use known employee IDs by using admin insert with explicit IDs

  console.log('━━━ Creating Owner ━━━')
  const ownerUuid = await createUser({
    empId: 'SE_5000', name: 'Satish Kashyap', role: 'owner',
    sex: 'male', dob: '1975-06-15', doj: '2015-01-01',
    aadhaar: '100200300400', password: OWNER_PASSWORD, isDefaultPassword: false,
  })

  console.log('\n━━━ Creating Managers ━━━')
  const mgr1Uuid = await createUser({
    empId: 'SE_5001', name: 'Rajesh Verma', role: 'manager',
    sex: 'male', dob: '1983-04-20', doj: '2018-03-01', aadhaar: '211322433544',
  })
  const mgr2Uuid = await createUser({
    empId: 'SE_5002', name: 'Pooja Sharma', role: 'manager',
    sex: 'female', dob: '1987-09-12', doj: '2019-07-15', aadhaar: '322433544655',
  })

  console.log('\n━━━ Creating Employees (under Rajesh Verma — SE_5001) ━━━')
  const emp1Uuid = await createUser({
    empId: 'SE_5003', name: 'Aakash Tiwari', role: 'employee',
    sex: 'male', dob: '1995-02-14', doj: '2021-06-01', aadhaar: '433544655766',
    managerId: mgr1Uuid,
  })
  const emp2Uuid = await createUser({
    empId: 'SE_5004', name: 'Neha Singh', role: 'employee',
    sex: 'female', dob: '1997-08-30', doj: '2022-01-10', aadhaar: '544655766877',
    managerId: mgr1Uuid,
  })
  const emp3Uuid = await createUser({
    empId: 'SE_5005', name: 'Sunil Rawat', role: 'employee',
    sex: 'male', dob: '1993-11-25', doj: '2020-09-01', aadhaar: '655766877988',
    managerId: mgr1Uuid,
  })

  console.log('\n━━━ Creating Employees (under Pooja Sharma — SE_5002) ━━━')
  const emp4Uuid = await createUser({
    empId: 'SE_5006', name: 'Kavya Menon', role: 'employee',
    sex: 'female', dob: '1996-05-07', doj: '2022-04-15', aadhaar: '766877988099',
    managerId: mgr2Uuid,
  })
  const emp5Uuid = await createUser({
    empId: 'SE_5007', name: 'Rohit Yadav', role: 'employee',
    sex: 'male', dob: '1994-03-18', doj: '2021-11-01', aadhaar: '877988099110',
    managerId: mgr2Uuid,
  })
  const emp6Uuid = await createUser({
    empId: 'SE_5008', name: 'Divya Pillai', role: 'employee',
    sex: 'female', dob: '1998-12-22', doj: '2023-02-01', aadhaar: '988099110221',
    managerId: mgr2Uuid,
  })

  // Advance the sequence to 8 so next UI-created user is SE_5009
  console.log('\n━━━ Advancing employee_id sequence to 8 ━━━')
  await resetSequence(8)
  console.log('  ✓ Next UI-created user will be SE_5009')

  // ── Timecards for all employees (May 1–15 workdays) ──
  console.log('\n━━━ Inserting Timecards ━━━')

  // SE_5003 Aakash — full 17 days, all applied
  await insertTimecards(emp1Uuid, MAY_WORKDAYS)
  console.log('  SE_5003 Aakash Tiwari   — 17 timecards (all applied)')

  // SE_5004 Neha — 15 days (took 2 days leave May 12-13)
  const nehavDates = MAY_WORKDAYS.filter(d => !['2026-05-12','2026-05-13'].includes(d))
  await insertTimecards(emp2Uuid, nehavDates)
  console.log('  SE_5004 Neha Singh       — 15 timecards (leave May 12-13)')

  // SE_5005 Sunil — 17 days applied
  await insertTimecards(emp3Uuid, MAY_WORKDAYS)
  console.log('  SE_5005 Sunil Rawat      — 17 timecards (all applied)')

  // SE_5006 Kavya — 17 days
  await insertTimecards(emp4Uuid, MAY_WORKDAYS)
  console.log('  SE_5006 Kavya Menon      — 17 timecards (all applied)')

  // SE_5007 Rohit — 16 days (1 leave May 8)
  const rohitDates = MAY_WORKDAYS.filter(d => d !== '2026-05-08')
  await insertTimecards(emp5Uuid, rohitDates)
  console.log('  SE_5007 Rohit Yadav      — 16 timecards (leave May 8)')

  // SE_5008 Divya — 17 days
  await insertTimecards(emp6Uuid, MAY_WORKDAYS)
  console.log('  SE_5008 Divya Pillai     — 17 timecards (all applied)')

  // Managers own timecards — pending with owner
  await insertTimecards(mgr1Uuid, ['2026-05-01','2026-05-02','2026-05-04','2026-05-05','2026-05-06'], 'Site supervision and team coordination.')
  console.log('  SE_5001 Rajesh Verma     — 5 timecards (pending with owner)')

  await insertTimecards(mgr2Uuid, ['2026-05-01','2026-05-02','2026-05-04','2026-05-05'], 'Project planning and electrical compliance review.')
  console.log('  SE_5002 Pooja Sharma     — 4 timecards (pending with owner)')

  // ── Leaves ──
  console.log('\n━━━ Inserting Leaves ━━━')

  // SE_5004 Neha — 2 days leave pending with Rajesh
  await insertLeave(emp2Uuid, '2026-05-12', 'Medical appointment.')
  await insertLeave(emp2Uuid, '2026-05-13', 'Medical appointment (follow-up).')
  console.log('  SE_5004 Neha — 2 leaves (May 12-13, pending with Rajesh)')

  // SE_5007 Rohit — 1 day leave pending with Pooja
  await insertLeave(emp5Uuid, '2026-05-08', 'Family function.')
  console.log('  SE_5007 Rohit — 1 leave (May 8, pending with Pooja)')

  // SE_5002 Pooja (manager) — 1 day leave pending with owner
  await insertLeave(mgr2Uuid, '2026-05-19', 'Personal work.')
  console.log('  SE_5002 Pooja — 1 leave (May 19, pending with owner)')

  // ── Overtime ──
  console.log('\n━━━ Inserting Overtime ━━━')

  await insertOvertime(emp1Uuid, '2026-05-06', 4, EMP_OT_RATE, 'Emergency panel repair — overtime required.')
  console.log(`  SE_5003 Aakash — 4 hrs OT (₹${4 * EMP_OT_RATE})`)

  await insertOvertime(emp3Uuid, '2026-05-07', 3, EMP_OT_RATE, 'Wiring installation after hours.')
  console.log(`  SE_5005 Sunil  — 3 hrs OT (₹${3 * EMP_OT_RATE})`)

  await insertOvertime(mgr1Uuid, '2026-05-05', 5, MGR_OT_RATE, 'Project deadline — site supervision extended.')
  console.log(`  SE_5001 Rajesh — 5 hrs OT (₹${5 * MGR_OT_RATE}, pending with owner)`)

  // ── System Config ──
  console.log('\n━━━ Updating System Config ━━━')
  const { data: existingCfg } = await supabase.from('system_config').select('id').single()
  if (existingCfg) {
    await supabase.from('system_config').update({
      annual_leave_days: ANNUAL_LEAVE,
      overtime_rate_per_hour: 100,
      updated_at: new Date().toISOString(),
    }).eq('id', existingCfg.id)
    console.log('  ✓ System config updated (24 leave days, ₹100/hr employee OT)')
  }

  // ── Summary ──
  console.log('\n' + '═'.repeat(60))
  console.log('✅ RESET & SEED COMPLETE')
  console.log('═'.repeat(60))
  console.log('\nOWNER:')
  console.log('  SE_5000  Satish Kashyap     Password: ChangeMe@2024!')
  console.log('\nMANAGERS (Password: Soumya@2024):')
  console.log('  SE_5001  Rajesh Verma        5 timecards + 1 OT pending with owner')
  console.log('  SE_5002  Pooja Sharma        4 timecards + 1 leave pending with owner')
  console.log('\nEMPLOYEES (Password: Soumya@2024):')
  console.log('  SE_5003  Aakash Tiwari   → Rajesh  | 17 timecards + 1 OT pending')
  console.log('  SE_5004  Neha Singh      → Rajesh  | 15 timecards + 2 leaves pending')
  console.log('  SE_5005  Sunil Rawat     → Rajesh  | 17 timecards + 1 OT pending')
  console.log('  SE_5006  Kavya Menon     → Pooja   | 17 timecards pending')
  console.log('  SE_5007  Rohit Yadav     → Pooja   | 16 timecards + 1 leave pending')
  console.log('  SE_5008  Divya Pillai    → Pooja   | 17 timecards pending')
  console.log('\nNext UI-created user: SE_5009')
  console.log('═'.repeat(60) + '\n')
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1) })
