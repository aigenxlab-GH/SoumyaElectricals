/**
 * capture-screenshots.mjs
 * Captures 20 screenshots for the User Manual.
 *
 * Strategy:
 * - Owner  (SE_5000 / 87654321): login normally → use window.__navigate for each page
 * - Manager / Employee: create fresh test users via Owner API (default password 12345678),
 *   then use the Login page's "Change Password" tab to set a known password and sign in.
 * - All cross-page navigation uses window.__navigate so the in-memory JWT is never lost.
 */

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const BASE_URL    = 'http://localhost:5173'
const API_URL     = 'http://localhost:8585/api/v1'
const OUT_DIR     = './screenshots'
const OWNER_ID    = 'SE_5000'
const OWNER_PASS  = '87654321'
const TEST_PASS   = 'Test@2024!'   // password we'll set for new test users

fs.mkdirSync(OUT_DIR, { recursive: true })

const wait = ms => new Promise(r => setTimeout(r, ms))

// ─── Pre-Puppeteer setup via Node fetch ──────────────────────────────────────

async function apiGet(path, token) {
  const r = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return r.json()
}

async function apiPost(path, body, token) {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  return r.json()
}

async function setupTestUsers() {
  console.log('Setting up test users…')

  // 1. Get owner token
  const loginRes = await apiPost('/auth/login', { employee_id: OWNER_ID, password: OWNER_PASS })
  const token = loginRes.data?.access_token
  if (!token) throw new Error('Owner login failed: ' + JSON.stringify(loginRes))

  // 2. Get all users
  const usersRes = await apiGet('/users', token)
  const allUsers = usersRes.data ?? []

  // 3. Re-use existing demo users if they were already created
  const existingMgr = allUsers.find(u => u.full_name === 'Demo Manager' && u.role === 'manager')
  const existingEmp = allUsers.find(u => u.full_name === 'Demo Employee' && u.role === 'employee')

  let managerEmpId = existingMgr?.employee_id
  let employeeEmpId = existingEmp?.employee_id

  // 4. Find an active manager for employee assignment
  const managers = allUsers.filter(u => u.role === 'manager' && u.is_active)
  if (!managers.length) throw new Error('No active managers found')
  const existingManagerUuid = managers[0].id

  // 5. Create manager if not yet exists
  if (!managerEmpId) {
    const ts = Date.now().toString().slice(-6)  // 6-digit suffix for unique Aadhaar
    const mgr = await apiPost('/users', {
      full_name:       'Demo Manager',
      role:            'manager',
      sex:             'male',
      date_of_birth:   '1988-05-10',
      date_of_joining: '2023-01-15',
      aadhaar:         `1000${ts}0001`,
      phone:           '9000000001',
      address:         'Demo Address, Raipur',
      monthly_salary:  45000,
    }, token)
    managerEmpId = mgr.data?.employee_id
    if (!managerEmpId) throw new Error('Manager creation failed: ' + JSON.stringify(mgr))
    console.log(`  ✓ Test manager created: ${managerEmpId}`)
  } else {
    console.log(`  ↩ Re-using existing test manager: ${managerEmpId}`)
  }

  // 6. Create employee if not yet exists
  if (!employeeEmpId) {
    const ts = Date.now().toString().slice(-6)
    const emp = await apiPost('/users', {
      full_name:       'Demo Employee',
      role:            'employee',
      sex:             'female',
      date_of_birth:   '1995-08-20',
      date_of_joining: '2024-03-01',
      aadhaar:         `2000${ts}0002`,
      phone:           '9000000002',
      address:         'Demo Address, Raipur',
      manager_id:      existingManagerUuid,
      monthly_salary:  30000,
    }, token)
    employeeEmpId = emp.data?.employee_id
    if (!employeeEmpId) throw new Error('Employee creation failed: ' + JSON.stringify(emp))
    console.log(`  ✓ Test employee created: ${employeeEmpId}`)
  } else {
    console.log(`  ↩ Re-using existing test employee: ${employeeEmpId}`)
  }

  // Determine which login flow to use:
  // - isDefaultPassword=true  → "Change Password" tab with 12345678
  // - isDefaultPassword=false → normal login with TEST_PASS
  const mgrUser  = allUsers.find(u => u.employee_id === managerEmpId)
  const empUser  = allUsers.find(u => u.employee_id === employeeEmpId)
  const managerNeedsChange  = mgrUser ? mgrUser.is_default_password  : true
  const employeeNeedsChange = empUser ? empUser.is_default_password  : true

  return { managerEmpId, employeeEmpId, managerNeedsChange, employeeNeedsChange }
}

// ─── Puppeteer helpers ────────────────────────────────────────────────────────

async function shot(page, name) {
  await wait(1200)
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.jpg`),
    type: 'jpeg', quality: 90, fullPage: false,
  })
  console.log(`  ✓ ${name}`)
}

// Full page load to /login — clears in-memory React Context
async function gotoLogin(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' })
  await wait(600)
}

// Fill a React Hook Form input using the native setter so React picks up the change
async function fillRHF(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 5000 })
  await page.evaluate(({ sel, val }) => {
    const el = document.querySelector(sel)
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, val)
    el.dispatchEvent(new Event('input',  { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, { sel: selector, val: value })
}

// Normal sign-in (for accounts with a known non-default password)
async function loginNormal(page, id, pass) {
  await page.waitForSelector('input[autocomplete="username"]')
  await fillRHF(page, 'input[autocomplete="username"]', id)
  await fillRHF(page, 'input[autocomplete="current-password"]', pass)
  await wait(300)
  await page.click('button[type="submit"]')
  await waitOffLogin(page, id)
}

// Use the "Change Password" tab to set a new password AND sign in in one step.
// Works for accounts where is_default_password=true (current pass = 12345678).
async function loginViaChangeTab(page, id, currentPass, newPass) {
  // Click the Change Password tab
  const tabs = await page.$$('.flex.rounded-lg button')
  if (tabs[1]) await tabs[1].click()
  await wait(400)

  await fillRHF(page, 'input[name="employee_id"]',     id)
  await fillRHF(page, 'input[name="current_password"]', currentPass)
  await fillRHF(page, 'input[name="new_password"]',     newPass)
  await fillRHF(page, 'input[name="confirm_password"]', newPass)
  await wait(300)
  await page.click('button[type="submit"]')
  await waitOffLogin(page, id)
}

// Poll until URL leaves /login (React Router navigated away after success)
async function waitOffLogin(page, label = '') {
  for (let i = 0; i < 30; i++) {
    await wait(500)
    if (!(await page.url()).includes('/login')) break
  }
  const url = await page.url()
  const ok  = !url.includes('/login')
  console.log(`    → ${label} logged in: ${ok ? 'YES' : 'FAILED'} (${url})`)
  await wait(1500)
}

// Client-side navigation using the exposed window.__navigate — no page reload → JWT kept
async function navigate(page, path) {
  await page.evaluate(p => window.__navigate(p), path)
  await wait(1500)
  const url = await page.url()
  if (!url.includes(path.split('?')[0]))
    console.log(`    ⚠ nav to ${path} ended at ${url}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// Create / find test accounts before launching browser
const { managerEmpId, employeeEmpId, managerNeedsChange, employeeNeedsChange } = await setupTestUsers()

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  defaultViewport: { width: 1280, height: 800 },
})
const page = await browser.newPage()
page.on('console', m => { if (m.type() === 'error') console.log('  [browser]', m.text().slice(0,100)) })

// ── 01 — Login page ──────────────────────────────────────────────────────────
console.log('\nLogin page…')
await gotoLogin(page)
await shot(page, '01-login')

// ── OWNER (SE_5000) ───────────────────────────────────────────────────────────
console.log('\nOwner session…')
await loginNormal(page, OWNER_ID, OWNER_PASS)
await shot(page, '02-owner-dashboard')

await navigate(page, '/owner/products');          await shot(page, '03-owner-products')
await navigate(page, '/inventory');               await shot(page, '04-inventory')
await navigate(page, '/quotations');              await shot(page, '05-quotations')
await navigate(page, '/offers');                  await shot(page, '06-offers')
await navigate(page, '/owner/users');             await shot(page, '07-owner-users')
await navigate(page, '/payroll');                 await shot(page, '08-payroll')
await navigate(page, '/owner/approvals/timecards'); await shot(page, '09-owner-timecard-approvals')
await navigate(page, '/owner/approvals/leaves');  await shot(page, '10-owner-leave-approvals')
await navigate(page, '/owner/calendar');          await shot(page, '11-owner-team-calendar')
await navigate(page, '/owner/config');            await shot(page, '12-owner-config')

// ── MANAGER ───────────────────────────────────────────────────────────────────
console.log('\nManager session…')
await gotoLogin(page)
if (managerNeedsChange)
  await loginViaChangeTab(page, managerEmpId, '12345678', TEST_PASS)
else
  await loginNormal(page, managerEmpId, TEST_PASS)
await shot(page, '13-manager-dashboard')

await navigate(page, '/my-timecard');             await shot(page, '14-my-timecard')
await navigate(page, '/my-leave');                await shot(page, '15-my-leave')
await navigate(page, '/my-calendar');             await shot(page, '16-my-calendar')
await navigate(page, '/approvals/timecards');     await shot(page, '17-manager-timecard-approvals')
await navigate(page, '/approvals/leaves');        await shot(page, '18-manager-leave-approvals')

// ── EMPLOYEE ──────────────────────────────────────────────────────────────────
console.log('\nEmployee session…')
await gotoLogin(page)
if (employeeNeedsChange)
  await loginViaChangeTab(page, employeeEmpId, '12345678', TEST_PASS)
else
  await loginNormal(page, employeeEmpId, TEST_PASS)
await shot(page, '19-employee-dashboard')
await navigate(page, '/payroll');                 await shot(page, '20-employee-payslips')

await browser.close()
console.log('\n✅  All 20 screenshots saved to ./screenshots/')
