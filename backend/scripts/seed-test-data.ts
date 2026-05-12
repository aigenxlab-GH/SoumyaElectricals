/**
 * Seed script — creates test users, timecards, and leaves for May 2026.
 *
 * Run from backend/:
 *   $env:SUPABASE_URL="https://mafdakbwchpmqqihpnbb.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<key>"
 *   npx ts-node scripts/seed-test-data.ts
 *
 * What it creates:
 *   3 Managers  (SE_5001 – SE_5003)
 *   12 Employees, 4 under each manager  (SE_5004 – SE_5015)
 *   Timecards for all employees, May 1–9 (Sun May 4 skipped)
 *   Timecard for Manager SE_5001 on May 9 → pending with owner
 *   Leaves for SE_5004 (May 7) and SE_5005 (May 8) → pending with Manager SE_5001
 *   Leave for Manager SE_5002 on May 9 → pending with owner
 *   All users: password = Soumya@2024  |  is_default_password = false
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'Soumya@2024'
const ANNUAL_LEAVE = 21
const DOMAIN = 'soumyaelectricals.internal'

// May 2026 work days (skip Sunday May 4)
const MAY_WORKDAYS = [
  '2026-05-01', '2026-05-02', '2026-05-03',
  '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09',
]

interface UserDef {
  employeeId: string
  fullName: string
  role: 'manager' | 'employee'
  sex: 'male' | 'female'
  dob: string
  doj: string
  aadhaar: string
  managerId?: string  // will be filled after manager UUIDs are known
}

const MANAGERS: UserDef[] = [
  { employeeId: 'SE_5001', fullName: 'Rahul Sharma',  role: 'manager', sex: 'male',   dob: '1985-03-15', doj: '2018-01-01', aadhaar: '111122223333' },
  { employeeId: 'SE_5002', fullName: 'Priya Patel',   role: 'manager', sex: 'female', dob: '1988-07-22', doj: '2019-06-01', aadhaar: '222233334444' },
  { employeeId: 'SE_5003', fullName: 'Amit Kumar',    role: 'manager', sex: 'male',   dob: '1982-11-08', doj: '2017-03-15', aadhaar: '333344445555' },
]

// 4 employees per manager — managerId to be assigned after managers are created
const EMPLOYEE_DEFS: Omit<UserDef, 'managerId'>[] = [
  // Under Manager 0 (SE_5001)
  { employeeId: 'SE_5004', fullName: 'Deepa Nair',     role: 'employee', sex: 'female', dob: '1995-04-12', doj: '2021-07-01', aadhaar: '444455556666' },
  { employeeId: 'SE_5005', fullName: 'Vikram Singh',   role: 'employee', sex: 'male',   dob: '1993-09-28', doj: '2022-01-15', aadhaar: '555566667777' },
  { employeeId: 'SE_5006', fullName: 'Sunita Rao',     role: 'employee', sex: 'female', dob: '1997-01-17', doj: '2023-03-01', aadhaar: '666677778888' },
  { employeeId: 'SE_5007', fullName: 'Karan Mehta',    role: 'employee', sex: 'male',   dob: '1996-06-05', doj: '2022-08-01', aadhaar: '777788889999' },
  // Under Manager 1 (SE_5002)
  { employeeId: 'SE_5008', fullName: 'Anita Desai',    role: 'employee', sex: 'female', dob: '1994-02-20', doj: '2020-11-01', aadhaar: '888899990000' },
  { employeeId: 'SE_5009', fullName: 'Suresh Yadav',   role: 'employee', sex: 'male',   dob: '1991-08-14', doj: '2019-09-01', aadhaar: '999900001111' },
  { employeeId: 'SE_5010', fullName: 'Meera Joshi',    role: 'employee', sex: 'female', dob: '1998-12-03', doj: '2023-06-01', aadhaar: '000011112222' },
  { employeeId: 'SE_5011', fullName: 'Ravi Verma',     role: 'employee', sex: 'male',   dob: '1990-05-25', doj: '2018-12-01', aadhaar: '111100002222' },
  // Under Manager 2 (SE_5003)
  { employeeId: 'SE_5012', fullName: 'Kavita Reddy',   role: 'employee', sex: 'female', dob: '1992-10-11', doj: '2020-04-01', aadhaar: '222200003333' },
  { employeeId: 'SE_5013', fullName: 'Mohan Das',      role: 'employee', sex: 'male',   dob: '1989-03-30', doj: '2017-08-01', aadhaar: '333300004444' },
  { employeeId: 'SE_5014', fullName: 'Shreya Gupta',   role: 'employee', sex: 'female', dob: '1996-07-19', doj: '2022-11-01', aadhaar: '444400005555' },
  { employeeId: 'SE_5015', fullName: 'Arun Pillai',    role: 'employee', sex: 'male',   dob: '1993-01-08', doj: '2021-02-01', aadhaar: '555500006666' },
]

async function createUser(def: UserDef & { managerId?: string }): Promise<string> {
  const email = `${def.employeeId.toLowerCase()}@${DOMAIN}`

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { employee_id: def.employeeId },
  })
  if (error) throw new Error(`Auth create failed for ${def.employeeId}: ${error.message}`)
  const uuid = data.user.id

  const { error: userErr } = await supabase.from('users').insert({
    id: uuid,
    employee_id: def.employeeId,
    full_name: def.fullName,
    role: def.role,
    sex: def.sex,
    date_of_birth: def.dob,
    date_of_joining: def.doj,
    aadhaar: def.aadhaar,
    manager_id: def.managerId ?? null,
    is_active: true,
    is_default_password: false,
  })
  if (userErr) throw new Error(`users insert failed for ${def.employeeId}: ${userErr.message}`)

  const { error: balErr } = await supabase.from('leave_balance').insert({
    user_id: uuid,
    total_credited: ANNUAL_LEAVE,
    used: 0,
    remaining: ANNUAL_LEAVE,
  })
  if (balErr) throw new Error(`leave_balance insert failed for ${def.employeeId}: ${balErr.message}`)

  console.log(`  ✓ ${def.employeeId} — ${def.fullName} (${def.role})`)
  return uuid
}

async function insertTimecards(userId: string, dates: string[]) {
  const rows = dates.map((date) => ({
    user_id: userId,
    date,
    work_log: 'Regular day — electrical maintenance and site work.',
    status: 'applied',
  }))
  const { error } = await supabase.from('timecards').insert(rows)
  if (error) throw new Error(`Timecards insert failed: ${error.message}`)
}

async function insertLeave(userId: string, date: string) {
  const { error } = await supabase.from('leaves').insert({
    user_id: userId,
    date,
    reason: 'Personal leave.',
    status: 'applied',
  })
  if (error) throw new Error(`Leave insert failed for ${date}: ${error.message}`)

  // Deduct from balance
  const { error: balErr } = await supabase
    .from('leave_balance')
    .update({ used: 1, remaining: ANNUAL_LEAVE - 1 })
    .eq('user_id', userId)
  if (balErr) throw new Error(`Balance deduct failed: ${balErr.message}`)
}

async function advanceSequence(to: number) {
  // Call nextval enough times to advance the sequence to `to`
  for (let i = 1; i <= to; i++) {
    await supabase.rpc('next_employee_id_seq')
  }
}

async function main() {
  console.log('\n=== Creating Managers ===')
  const managerUuids: string[] = []
  for (const mgr of MANAGERS) {
    const uuid = await createUser(mgr)
    managerUuids.push(uuid)
  }

  console.log('\n=== Creating Employees ===')
  const employeeUuids: string[] = []
  for (let i = 0; i < EMPLOYEE_DEFS.length; i++) {
    const managerIdx = Math.floor(i / 4)  // 4 employees per manager
    const uuid = await createUser({ ...EMPLOYEE_DEFS[i], managerId: managerUuids[managerIdx] })
    employeeUuids.push(uuid)
  }

  // Advance employee_id_seq so the next UI-created user gets SE_5016
  console.log('\n=== Advancing employee_id sequence to 15 ===')
  await advanceSequence(15)
  console.log('  ✓ Sequence set to 15 (next user will be SE_5016)')

  console.log('\n=== Inserting Timecards (all 12 employees, May 1–9) ===')
  // SE_5004 (index 0) skips May 7 (has leave), SE_5005 (index 1) skips May 8 (has leave)
  for (let i = 0; i < employeeUuids.length; i++) {
    let dates = [...MAY_WORKDAYS]
    if (i === 0) dates = dates.filter((d) => d !== '2026-05-07')  // SE_5004 on leave May 7
    if (i === 1) dates = dates.filter((d) => d !== '2026-05-08')  // SE_5005 on leave May 8
    await insertTimecards(employeeUuids[i], dates)
    console.log(`  ✓ ${EMPLOYEE_DEFS[i].employeeId} — ${dates.length} timecards`)
  }

  console.log('\n=== Timecard for Manager SE_5001 (May 9 — pending with owner) ===')
  await insertTimecards(managerUuids[0], ['2026-05-09'])
  console.log('  ✓ SE_5001 — 1 timecard (May 9)')

  console.log('\n=== Leaves for SE_5004 and SE_5005 (pending with Manager SE_5001) ===')
  await insertLeave(employeeUuids[0], '2026-05-07')
  console.log('  ✓ SE_5004 — leave May 7')
  await insertLeave(employeeUuids[1], '2026-05-08')
  console.log('  ✓ SE_5005 — leave May 8')

  console.log('\n=== Leave for Manager SE_5002 (May 9 — pending with owner) ===')
  await insertLeave(managerUuids[1], '2026-05-09')
  console.log('  ✓ SE_5002 — leave May 9')

  console.log('\n=== ✅ Seed complete! Test credentials ===\n')
  console.log('Password for ALL users: Soumya@2024\n')
  console.log('MANAGERS:')
  MANAGERS.forEach((m, i) => {
    console.log(`  ${m.employeeId}  ${m.fullName.padEnd(18)}  ${m.employeeId.toLowerCase()}@${DOMAIN}`)
    if (i === 0) console.log('    → Has 1 timecard (May 9) pending with owner; 2 employees have leaves pending with them')
    if (i === 1) console.log('    → Has 1 leave (May 9) pending with owner')
  })
  console.log('\nEMPLOYEES:')
  EMPLOYEE_DEFS.forEach((e, i) => {
    const managerIdx = Math.floor(i / 4)
    const note = i === 0 ? '  → 7 timecards + leave May 7 (pending with SE_5001)'
                : i === 1 ? '  → 7 timecards + leave May 8 (pending with SE_5001)'
                : `  → 8 timecards pending with ${MANAGERS[managerIdx].employeeId}`
    console.log(`  ${e.employeeId}  ${e.fullName.padEnd(18)}  ${e.employeeId.toLowerCase()}@${DOMAIN}`)
    console.log(note)
  })
}

main().catch((err) => { console.error(err); process.exit(1) })
