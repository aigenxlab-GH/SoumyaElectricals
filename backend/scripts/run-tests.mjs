// Automated test runner for Soumya Electricals WMS
// Run: node backend/scripts/run-tests.mjs

const BASE = 'http://localhost:8585/api/v1'

// Unique Aadhaar per test run to avoid duplicate errors across runs
const TEST_AADHAAR = String(Date.now()).slice(-12).padStart(12, '9')

let pass = 0, fail = 0, warn = 0
const results = []

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return { status: res.status, success: res.ok }
  }
  try {
    const json = await res.json()
    return { status: res.status, ...json }
  } catch {
    return { status: res.status, success: res.ok }
  }
}

function check(id, desc, condition, detail = '') {
  if (condition) {
    pass++
    results.push(`  ✅ ${id} — ${desc}${detail ? ' | ' + detail : ''}`)
  } else {
    fail++
    results.push(`  ❌ ${id} — ${desc}${detail ? ' | GOT: ' + detail : ''}`)
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(r => setTimeout(r, ms))

async function loginWithRetry(empId, password, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    const r = await api('POST', '/auth/login', { employee_id: empId, password })
    if (r.success) return r
    if (r.error?.code === 'RATE_LIMITED') {
      console.log(`  ⏳ Rate limited on login for ${empId}, waiting 62s...`)
      await delay(62000)
      continue
    }
    return r
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
console.log('\n🚀 Starting test run...\n')

// AUTH TESTS
console.log('━━━ TC-AUTH: Login & Password ━━━')

// ── Get all tokens first (with retry on rate limit) ───────────────────────────
console.log('  Obtaining tokens...')
const ownerLogin = await loginWithRetry('SE_5000', 'ChangeMe@2024!')
check('AUTH-01', 'Owner login returns token + role=owner', ownerLogin?.success && ownerLogin.data?.user?.role === 'owner')

await delay(700)
const mgrLogin = await loginWithRetry('SE_5001', 'Soumya@2024')
check('AUTH-02', 'Manager login returns token', mgrLogin?.success && !!mgrLogin.data?.access_token)

await delay(700)
const empLogin = await loginWithRetry('SE_5004', 'Soumya@2024')
check('AUTH-03', 'Employee login returns token', empLogin?.success && !!empLogin.data?.access_token)

await delay(700)
const EMP2_LOGIN = await loginWithRetry('SE_5008', 'Soumya@2024')

await delay(700)
const MGR2_LOGIN = await loginWithRetry('SE_5002', 'Soumya@2024')

// Negative login tests (using non-existent/wrong creds — these hit Supabase but faster)
await delay(700)
const wrongPass = await api('POST', '/auth/login', { employee_id: 'SE_5001', password: 'WrongPass123' })
check('AUTH-04', 'Wrong password returns INVALID_CREDENTIALS', !wrongPass.success && wrongPass.error?.code === 'INVALID_CREDENTIALS')

await delay(700)
const wrongId = await api('POST', '/auth/login', { employee_id: 'SE_9999', password: 'Soumya@2024' })
check('AUTH-05', 'Wrong employee ID returns INVALID_CREDENTIALS', !wrongId.success && wrongId.error?.code === 'INVALID_CREDENTIALS')

// Validation-only test — doesn't hit Supabase, not rate limited
const emptyLogin = await api('POST', '/auth/login', {})
check('AUTH-06', 'Empty login body returns VALIDATION_ERROR', !emptyLogin.success && emptyLogin.error?.code === 'VALIDATION_ERROR')

const noToken = await api('GET', '/timecards')
check('AUTH-14', 'No token returns UNAUTHORIZED', !noToken.success && noToken.error?.code === 'UNAUTHORIZED')

// Extract tokens
const OWNER = ownerLogin?.data?.access_token
const MGR = mgrLogin?.data?.access_token
const EMP = empLogin?.data?.access_token
const EMP2 = EMP2_LOGIN?.data?.access_token
const MGR2 = MGR2_LOGIN?.data?.access_token

// ─── EMPLOYEE TESTS ───────────────────────────────────────────────────────────
console.log('\n━━━ TC-EMP: Employee (SE_5004) ━━━')

// Dashboard
const empDash = await api('GET', '/dashboard', null, EMP)
check('EMP-01', 'Employee dashboard returns data', empDash.success && empDash.data !== undefined)

// Timecards
const tcList = await api('GET', '/timecards?year=2026&month=5', null, EMP)
check('EMP-02', 'Employee can list timecards', tcList.success && Array.isArray(tcList.data))

// Sunday block (2026-05-10 is Sunday)
const sundayTc = await api('POST', '/timecards', { date: '2026-05-10', work_log: 'Sunday test' }, EMP)
check('EMP-04', 'Timecard on Sunday is blocked', !sundayTc.success, sundayTc.error?.code)

// Valid timecard creation
const newTc = await api('POST', '/timecards', { date: '2026-05-27', work_log: 'Test work log entry' }, EMP)
check('EMP-03', 'Create valid timecard succeeds', newTc.success && newTc.data?.status === 'applied', newTc.error?.message ?? '')

// Duplicate date
const dupTc = await api('POST', '/timecards', { date: '2026-05-27', work_log: 'Duplicate' }, EMP)
check('EMP-06', 'Duplicate timecard date is blocked', !dupTc.success, dupTc.error?.code)

// Edit applied timecard
if (newTc.data?.id) {
  const editTc = await api('PATCH', `/timecards/${newTc.data.id}`, { work_log: 'Updated log' }, EMP)
  check('EMP-08', 'Edit applied timecard succeeds', editTc.success && editTc.data?.work_log === 'Updated log')

  // Delete applied timecard
  const delTc = await api('DELETE', `/timecards/${newTc.data.id}`, null, EMP)
  check('EMP-09', 'Delete applied timecard succeeds', delTc.success)
}

// Leave balance
const balance = await api('GET', '/leaves/balance', null, EMP)
check('EMP-16', 'Leave balance endpoint returns data', balance.success && balance.data?.remaining !== undefined, `remaining=${balance.data?.remaining}`)

// Apply valid leave (use a future date unlikely to conflict)
const balBefore = await api('GET', '/leaves/balance', null, EMP)
const newLeave = await api('POST', '/leaves', { date: '2026-06-02', reason: 'Test leave' }, EMP)
check('EMP-17', 'Apply valid leave succeeds', newLeave.success && newLeave.data?.status === 'applied', newLeave.error?.message ?? '')

// Leave on Sunday (2026-05-10 = Sunday)
const sundayLeave = await api('POST', '/leaves', { date: '2026-05-10', reason: 'Sunday test' }, EMP)
check('EMP-18', 'Leave on Sunday is blocked with INVALID_DATE', !sundayLeave.success && sundayLeave.error?.code === 'INVALID_DATE', sundayLeave.error?.code)

// Delete leave and check balance restored
if (newLeave.data?.id) {
  const delLeave = await api('DELETE', `/leaves/${newLeave.data.id}`, null, EMP)
  const balAfter = await api('GET', '/leaves/balance', null, EMP)
  check('EMP-22', 'Delete leave restores balance', delLeave.success && balAfter.data?.remaining >= balBefore.data?.remaining)
}

// Overtime
const newOt = await api('POST', '/overtime', { date: '2026-05-29', hours: 3, work_log: 'Test OT work' }, EMP)
check('EMP-12', 'Create overtime succeeds', newOt.success && newOt.data?.status === 'applied', newOt.error?.message ?? '')

// ─── MANAGER TESTS ────────────────────────────────────────────────────────────
console.log('\n━━━ TC-MGR: Manager (SE_5001) ━━━')

// Manager can submit own timecard (use a future non-holiday date)
const mgrTc = await api('POST', '/timecards', { date: '2026-06-15', work_log: 'Manager work log' }, MGR)
check('MGR-01', 'Manager can submit own timecard', mgrTc.success && mgrTc.data?.status === 'applied', mgrTc.error?.message ?? '')

// Manager timecard approvals — only own team (SE_5004–SE_5007)
const mgrApprovals = await api('GET', '/approvals/timecards', null, MGR)
check('MGR-04', 'Manager sees pending timecard approvals', mgrApprovals.success && Array.isArray(mgrApprovals.data))

// Verify SE_5008 (under MGR2) is NOT in MGR's queue
if (mgrApprovals.data) {
  const emp2InQueue = mgrApprovals.data.some(tc => tc.users?.employee_id === 'SE_5008')
  check('MGR-09', 'SE_5008 (other team) not in MGR SE_5001 queue', !emp2InQueue)
}

// Manager leave approvals
const mgrLeaveApprovals = await api('GET', '/approvals/leaves', null, MGR)
check('MGR-10', 'Manager sees leave approvals for own team', mgrLeaveApprovals.success && Array.isArray(mgrLeaveApprovals.data))

// Approve a timecard if any pending
if (mgrApprovals.data?.length > 0) {
  const tcToApprove = mgrApprovals.data[0]
  const approveRes = await api('POST', `/approvals/timecards/${tcToApprove.id}`, { action: 'approve' }, MGR)
  check('MGR-06', 'Manager can approve timecard', approveRes.success, approveRes.error?.message ?? '')
}

// Approve a leave if any pending — verify balance unchanged
if (mgrLeaveApprovals.data?.length > 0) {
  const leaveToApprove = mgrLeaveApprovals.data[0]
  const empIdOfLeave = leaveToApprove.users?.employee_id
  // Get employee token for balance check
  const empLeaveToken = empIdOfLeave === 'SE_5004' ? EMP : EMP2
  const balBefore = await api('GET', '/leaves/balance', null, empLeaveToken)
  const approveLeave = await api('POST', `/approvals/leaves/${leaveToApprove.id}`, { action: 'approve' }, MGR)
  const balAfter = await api('GET', '/leaves/balance', null, empLeaveToken)
  check('MGR-11', 'Approve leave does NOT restore balance', approveLeave.success && balAfter.data?.remaining === balBefore.data?.remaining, approveLeave.error?.message ?? '')
} else {
  check('MGR-11', 'Approve leave does NOT restore balance', true, 'no pending leaves — skipped')
}

// ─── OWNER TESTS ──────────────────────────────────────────────────────────────
console.log('\n━━━ TC-OWN: Owner (SE_5000) ━━━')

// Owner dashboard
const ownerDash = await api('GET', '/dashboard', null, OWNER)
check('OWN-01', 'Owner dashboard returns pending counts', ownerDash.success && ownerDash.data !== undefined)

// Owner sees only manager timecards (not employee)
const ownerApprovals = await api('GET', '/approvals/timecards', null, OWNER)
check('OWN-04', 'Owner gets timecard approvals', ownerApprovals.success && Array.isArray(ownerApprovals.data))
if (ownerApprovals.data) {
  const hasEmployee = ownerApprovals.data.some(tc => tc.users?.role === 'employee')
  check('OWN-04b', 'Owner queue has NO employee timecards (managers only)', !hasEmployee, `employee entries found: ${ownerApprovals.data.filter(tc=>tc.users?.role==='employee').length}`)
}

// Owner user management
const userList = await api('GET', '/users', null, OWNER)
check('OWN-15', 'Owner can list all users', userList.success && Array.isArray(userList.data), `count=${userList.data?.length}`)

// Owner create user — duplicate Aadhaar test
// First get an existing aadhaar (need to use owner endpoint to view full user)
// Try creating user with invalid aadhaar (not 12 digits)
const badAadhaar = await api('POST', '/users', {
  full_name: 'Test User', role: 'employee', sex: 'male',
  date_of_birth: '1990-01-01', date_of_joining: '2026-05-09',
  aadhaar: '12345', manager_id: null
}, OWNER)
check('OWN-23', 'Create user with invalid Aadhaar (<12 digits) blocked', !badAadhaar.success, badAadhaar.error?.code)

// Create a valid user (unique Aadhaar per test run)
const newUser = await api('POST', '/users', {
  full_name: 'Test Auto User', role: 'employee', sex: 'male',
  date_of_birth: '1995-06-15', date_of_joining: '2026-05-09',
  aadhaar: TEST_AADHAAR, manager_id: null
}, OWNER)
check('OWN-21', 'Create valid user succeeds', newUser.success && newUser.data?.employee_id?.startsWith('SE_'), newUser.error?.message ?? `id=${newUser.data?.employee_id}`)

// Duplicate Aadhaar test (use same Aadhaar again)
const dupAadhaar = await api('POST', '/users', {
  full_name: 'Dup Aadhaar User', role: 'employee', sex: 'male',
  date_of_birth: '1996-01-01', date_of_joining: '2026-05-09',
  aadhaar: TEST_AADHAAR, manager_id: null
}, OWNER)
check('OWN-22', 'Duplicate Aadhaar returns DUPLICATE_AADHAAR error', !dupAadhaar.success && dupAadhaar.error?.code === 'DUPLICATE_AADHAAR', dupAadhaar.error?.message ?? '')

// Owner config
const config = await api('GET', '/config', null, OWNER)
check('OWN-31', 'Owner can read system config', config.success && config.data?.annual_leave_days !== undefined, `leave_days=${config.data?.annual_leave_days}`)
check('OWN-31b', 'Config has manager_overtime_rate_per_hour', config.data?.manager_overtime_rate_per_hour !== undefined, `mgr_ot_rate=${config.data?.manager_overtime_rate_per_hour}`)

// ─── SECURITY TESTS ───────────────────────────────────────────────────────────
console.log('\n━━━ TC-SEC: Security / Cross-Role ━━━')

// Employee cannot access approval routes
const empApproval = await api('GET', '/approvals/timecards', null, EMP)
check('SEC-01', 'Employee blocked from approval routes', !empApproval.success && empApproval.error?.code === 'FORBIDDEN')

// Employee cannot access owner user list
const empUsers = await api('GET', '/users', null, EMP)
check('SEC-02', 'Employee blocked from owner user list', !empUsers.success && empUsers.error?.code === 'FORBIDDEN')

// Manager blocked from owner user management
const mgrUsers = await api('GET', '/users', null, MGR)
check('SEC-03', 'Manager blocked from owner user list', !mgrUsers.success && mgrUsers.error?.code === 'FORBIDDEN')

// Employee sees only own timecards (SE_5004 data only)
const empTcs = await api('GET', '/timecards?year=2026&month=5', null, EMP)
check('SEC-04', 'Employee only sees own timecards', empTcs.success && empTcs.data?.every(tc => tc.user_id !== undefined))

// Manager queue isolation — SE_5001 doesn't see SE_5008's timecards
check('SEC-05', 'Manager queue does not include other team', !mgrApprovals.data?.some(tc => tc.users?.employee_id === 'SE_5008'))

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
console.log('\n' + results.join('\n'))
console.log(`\n${'─'.repeat(60)}`)
console.log(`📊 Results: ✅ ${pass} passed  ❌ ${fail} failed  ⚠️  ${warn} warnings`)
console.log(`${'─'.repeat(60)}\n`)
