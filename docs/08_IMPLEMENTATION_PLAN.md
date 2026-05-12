# 08 — Implementation Plan
## Soumya Electricals — Workforce Management System

---

## Overview

**15 milestones** ordered by dependency. Each task is scoped to fit one APPLY session (~30–60 minutes).

**Sequencing principle:** Infrastructure → Database → Auth → Core APIs → Frontend (journey order) → Admin → Tests → Deploy

---

## M-01 — Workspace Bootstrap & Environment Setup

**Objective:** All three npm workspaces install, compile without errors, and can reach local Supabase.

**Deliverables:**
- Verified `npm install` and workspace symlinks
- Local Supabase project running
- All three `tsconfig.json` files passing `tsc --noEmit`
- `.env` files in place for backend and frontend

**Tasks:**
1. Run `npm install` at monorepo root; verify `@soumya/shared` resolves correctly in backend and frontend `node_modules`
2. Install Supabase CLI globally; run `npx supabase init` and `npx supabase start`; record the local API URL, anon key, service-role key, JWT secret from the CLI output
3. Create `backend/.env` from `.env.example`; fill in all five Supabase + Database vars from step 2; add a 32-char random `X_CRON_SECRET`
4. Create `frontend/.env` from `.env.example`; fill in `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
5. Run `npx tsc --noEmit` in `shared/`; fix any type errors in schemas or models
6. Run `npx tsc --noEmit` in `backend/`; fix any type errors in src files
7. Run `npx tsc --noEmit` in `frontend/`; fix any type errors in src files

**Dependencies:** None — first milestone

**Validation:**
- `npm install` exits 0; `ls backend/node_modules/@soumya` shows `shared` symlink
- `npx supabase status` shows all services healthy
- All three `tsc --noEmit` runs exit 0 with no errors

**Risks:**
- `node-flyway` requires Java 8+ on the machine — install JRE if missing
- `@soumya/shared` path alias requires `paths` in each `tsconfig.json` to match actual relative path

---

## M-02 — Database: Flyway Migrations

**Objective:** All 9 migrations applied to local Supabase; all tables, indexes, RLS policies, PG functions, pg_cron job, and seed data exist.

**Deliverables:**
- All 9 V*.sql files executed cleanly by Flyway
- Schema verified in Supabase Studio (localhost:54323)
- Owner auth user created; V8 seed executed

**Tasks:**
1. Fix `lib/flyway.ts` JDBC URL construction — verify `new URL(config.DATABASE_URL)` correctly extracts host, pathname, username, password for local Supabase postgres URL (`postgresql://postgres:postgres@localhost:54322/postgres`)
2. Run `npm run dev:backend` once to trigger Flyway — confirm V1–V7, V9 apply; check `flyway_schema_history` table in Studio
3. Fix V8 seed — create owner auth user via Supabase Admin API (`supabase.auth.admin.createUser`); run a one-time Node.js script to insert the `users` + `leave_balance` rows with the returned UUID; mark owner employee_id as `SE_5000`
4. Verify V6 pg_cron — check `cron.job` table in Studio shows `monthly-leave-credit` job; confirm Supabase Pro plan is active (pg_cron silently no-ops on free tier)
5. Verify all RLS policies by running raw SQL in Studio as an anon role — confirm employees cannot see other users' timecards; confirm aadhaar column is hidden for non-owner

**Dependencies:** M-01 complete

**Validation:**
- `SELECT * FROM flyway_schema_history ORDER BY installed_rank` shows 9 rows, all `success = true`
- All 7 tables exist with correct columns and constraints
- Owner can log in via Supabase Studio Auth tab

**Risks:**
- V6 pg_cron requires `pg_cron` extension enabled in Supabase Dashboard → Extensions — enable it first
- V5 stored proc `deduct_leave_balance` raises exception if balance insufficient — integration test must cover this

---

## M-03 — Authentication Backend

**Objective:** Login, change-password, force-password-change gate, and rate limits all work correctly via API.

**Deliverables:**
- `POST /api/v1/auth/login` returns tokens + user object
- `POST /api/v1/auth/change-password` updates password and clears `is_default_password`
- `forcePasswordChange` middleware blocks all routes when flag is true
- Rate limits enforce 10/min login, 5/min change-password

**Tasks:**
1. Wire `auth.router.ts` into `app.ts` — confirm `POST /api/v1/auth/login` is reachable; test with `curl` using owner credentials; expect `200` with `access_token`, `refresh_token`, `user`
2. Test login failure cases: wrong employee ID → `401`; wrong password → `401`; missing body → `422` with validation details
3. Test `POST /api/v1/auth/change-password` — supply valid `old_password` and `new_password`; confirm `is_default_password` flips to `false` in DB; confirm original password no longer works
4. Verify `forcePasswordChange` middleware — log in as a newly created user (flag is `true`); confirm any non-change-password route returns `403 FORCE_PASSWORD_CHANGE`
5. Verify rate limits — send 11 login requests in under 60s; confirm 11th returns `429`; confirm `X-RateLimit-*` headers present
6. Add pino HTTP logging to `app.ts` using `pino-http`; confirm request logs appear on `npm run dev:backend` with `requestId` field; confirm password fields are `[Redacted]` in logs

**Dependencies:** M-02 complete (owner user must exist in DB)

**Validation:**
- Owner login returns `200` with JWT
- New user login with default password, then any API call → `403 FORCE_PASSWORD_CHANGE`
- After change-password, `is_default_password = false` in DB
- 11th login in 60s → `429`

**Risks:**
- Supabase Auth `signInWithPassword` uses synthetic email — ensure `employeeIdToEmail()` matches exactly what was used when creating the auth user in V8
- `pino-http` must be added as a dependency if not already in `backend/package.json`

---

## M-04 — Timecards API

**Objective:** Full timecard CRUD + bulk creation works, with Sunday/holiday exclusion and duplicate detection enforced.

**Deliverables:**
- `GET /api/v1/timecards?year=&month=` returns list
- `POST /api/v1/timecards` creates single; `POST /api/v1/timecards/bulk` creates many, skipping excluded dates
- `PATCH /api/v1/timecards/:id` and `DELETE /api/v1/timecards/:id` work only on `status='applied'` records
- Business rules enforced: no Sunday, no holiday, no duplicate date for same user

**Tasks:**
1. Wire `timecard.router.ts` into `app.ts`; test `GET /api/v1/timecards?year=2024&month=5` with a valid token — expect empty array for a new user
2. Test `POST /api/v1/timecards` with a valid weekday date — expect `201` with timecard row; confirm row in DB with `status='applied'`
3. Test Sunday rejection — `POST` with a Sunday date → expect `400 INVALID_DATE`
4. Test holiday rejection — add a holiday to DB; `POST` with that date → expect `400 INVALID_DATE`
5. Test duplicate rejection — `POST` same date twice → second call returns `409 DUPLICATE`
6. Test `POST /api/v1/timecards/bulk` — range spanning one week; confirm Sundays excluded from created list; confirm `skipped` count is correct
7. Test bulk with pre-existing dates — confirm `skipped` includes both weekends and duplicates
8. Test `PATCH /:id` on an `applied` timecard — confirm `work_log` updates; test `PATCH` on an `approved` timecard → expect `400 UNEDITABLE`
9. Test `DELETE /:id` on `applied` → `204`; test `DELETE` on `approved` → `400 UNEDITABLE`; test `DELETE` with another user's ID → `404`

**Dependencies:** M-03 complete (authenticate middleware must work)

**Validation:**
- All 9 task scenarios pass
- Sundays never appear in any created timecard
- Approved timecards cannot be edited or deleted

**Risks:**
- `configRepository.getHolidayDates()` is called on every create — add a short-lived in-memory cache if needed for bulk operations on large ranges

---

## M-05 — Leaves API

**Objective:** Leave application, balance deduction, bulk apply, edit, delete (with balance restore), and balance endpoint all work correctly.

**Deliverables:**
- `GET /leaves/balance` returns current balance
- `POST /leaves` and `POST /leaves/bulk` apply leave, deduct balance, exclude Sundays/holidays
- `PATCH` and `DELETE` on `applied` leaves work; delete restores balance
- Insufficient balance returns `400`

**Tasks:**
1. Wire `leave.router.ts` into `app.ts`; test `GET /api/v1/leaves/balance` — expect `{ total_credited, used, remaining }` for the logged-in user
2. Test `POST /api/v1/leaves` with a valid weekday — expect `201`; confirm balance `remaining` decrements by 1 in DB
3. Test insufficient balance — set user remaining to 0 in DB; `POST` a leave → expect `400 INSUFFICIENT_BALANCE` with clear message; restore balance
4. Test bulk leave application — range spanning 3 weekdays; confirm all 3 created; confirm `remaining` decremented by 3
5. Test `DELETE /:id` on `applied` leave — confirm row deleted AND `remaining` restored by 1 (call `GET /leaves/balance` before and after)
6. Test that rejecting a leave via the approvals endpoint restores balance (covered again in M-07; placeholder test here)
7. Test Sunday/holiday exclusion in bulk — same logic as timecards M-04 task 6
8. Test `PATCH /:id` — update reason on `applied` leave; test on `approved` leave → `400 UNEDITABLE`
9. Test that `GET /api/v1/leaves?year=&month=` returns only the logged-in user's own leaves

**Dependencies:** M-04 complete

**Validation:**
- Balance deducts on apply, restores on delete
- Insufficient balance blocks apply atomically (balance never goes negative)
- `deduct_leave_balance` stored proc executes atomically

**Risks:**
- `deduct_leave_balance` PG function raises exception if balance < requested days — ensure `AppError` wrapping catches Supabase `error.message` cleanly

---

## M-06 — Overtime API

**Objective:** Overtime CRUD works; payout is auto-calculated using current system rate; same date rules as timecards.

**Deliverables:**
- `POST /overtime` creates record with `payout = hours × system_rate`
- `PATCH /overtime/:id` recalculates payout at the current rate
- Date rules enforced (no Sunday, no holiday)

**Tasks:**
1. Wire `overtime.router.ts` into `app.ts`; test `GET /api/v1/overtime?year=&month=` — expect empty array
2. Test `POST /api/v1/overtime` — confirm `payout` in response equals `hours × system_config.overtime_rate_per_hour`; confirm row in DB
3. Test Sunday/holiday rejection — same as M-04 tasks 3 and 4 but for overtime endpoint
4. Test `PATCH /:id` — change `hours`; confirm `payout` recalculates using current rate (not rate at time of original creation); test patch on `approved` → `400`
5. Test `DELETE /:id` — on `applied` → `204`; on `approved` → `400`; on another user's record → `404`

**Dependencies:** M-03 complete (M-04 and M-05 do not block overtime)

**Validation:**
- Payout formula is `hours × current_rate` at both create and update time
- All date exclusion rules match timecard behaviour

**Risks:** None specific beyond M-04/M-05 patterns already established

---

## M-07 — Approvals API

**Objective:** Role-scoped pending queues work; atomic approve/reject enforced; Manager sees only their team; Owner sees all.

**Deliverables:**
- `GET /approvals/timecards` returns correct queue for Manager vs Owner
- `POST /approvals/timecards/:id` with `{ action: "approve" | "reject" }` changes status atomically
- `POST /approvals/leaves/:id` approve restores nothing; reject restores balance
- Race condition tested: two simultaneous approvals → one `409`

**Tasks:**
1. Wire `approval.router.ts` into `app.ts`; test `GET /api/v1/approvals/timecards` as Manager — expect only timecards from the Manager's direct reports
2. Test `GET /api/v1/approvals/timecards` as Owner — expect timecards from all employees across all managers
3. Test `POST /api/v1/approvals/timecards/:id` with `action: "approve"` — confirm timecard `status` flips to `approved`; confirm it disappears from pending queue
4. Test `POST /api/v1/approvals/timecards/:id` with `action: "reject"` — confirm `status` flips to `rejected`
5. Test `POST /api/v1/approvals/timecards/:id` on already-approved timecard → expect `409 CONFLICT`
6. Test leave approvals — same as tasks 3–5 for `/approvals/leaves/:id`; additionally confirm balance does NOT restore on approve, DOES restore on reject
7. Test Manager cannot approve a timecard belonging to an employee not in their team — expect `409` or `404`
8. Simulate race condition — two simultaneous `approve` requests for the same leave; use `Promise.all` in a test script; confirm exactly one `200` and one `409`

**Dependencies:** M-04, M-05 complete (need timecards and leaves in DB to test against)

**Validation:**
- Manager queue excludes other managers' team records
- Simultaneous approve → one wins, one gets `409`
- Leave reject always restores balance, leave approve never does

**Risks:**
- Race condition test requires real concurrent DB calls — cannot be reliably tested with mocks; run against local Supabase

---

## M-08 — Supporting APIs (Users, Config, Calendar, Dashboard)

**Objective:** All remaining backend endpoints work; system is feature-complete on the API layer.

**Deliverables:**
- `GET|POST|PATCH /users` — full CRUD; role downgrade blocked if linked employees exist
- `GET|PUT /config` — system config + holiday list saved atomically
- `GET /calendar` — merged day-map for a user × month
- `GET /dashboard` — role-aware stats

**Tasks:**
1. Wire `user.router.ts`; test `GET /api/v1/users` as Owner — expect full user list without aadhaar; test same as Manager → `403`
2. Test `POST /api/v1/users` — create a new Employee; confirm `employee_id` is `SE_5001` (or next in sequence); confirm Supabase Auth user created; confirm `leave_balance` row inserted with `remaining = annual_leave_days`
3. Test `PATCH /api/v1/users/:id` — change role from `manager` to `employee` while linked employees exist → expect `400 LINKED_EMPLOYEES`; delink employees then retry → expect `200`
4. Test `GET /api/v1/users/:id` as Owner → aadhaar field present; test same as Manager → `403`
5. Wire `config.router.ts`; test `GET /api/v1/config` — returns `system_config` + `holidays` array
6. Test `PUT /api/v1/config` — update annual leave days and add 2 holidays; call `GET` again to verify; confirm old holidays are fully replaced (not appended)
7. Wire `calendar.router.ts`; test `GET /api/v1/calendar?year=2024&month=1&user_id=<id>` as Manager — expect day-map with `timecard`, `leave`, `holiday` entries for the requested user
8. Test calendar as Employee with `user_id` of another user → expect `403 FORBIDDEN`
9. Wire `dashboard.router.ts`; test `GET /api/v1/dashboard` as Employee → expect employee stats; as Owner → expect pending counts

**Dependencies:** M-03 complete; M-04, M-05, M-06 useful for calendar/dashboard test data

**Validation:**
- All 9 task scenarios pass
- Aadhaar never appears in non-owner user responses
- Config `PUT` fully replaces holidays (not merges)

**Risks:**
- `configRepository.saveConfig` deletes all holidays then inserts new ones — if insert fails, holidays table is empty; wrap in a DB transaction or accept the risk for v1

---

## M-09 — Frontend: Auth Screens + Core Infrastructure

**Objective:** Login and change-password work end-to-end in the browser; auth token flows to all subsequent API calls; role-based routing redirects correctly.

**Deliverables:**
- Login page submits, stores token in-memory, redirects by role
- Change-password page forces password update then redirects
- `ProtectedRoute` redirects unauthenticated users to `/login`
- `RoleRoute` redirects wrong-role users to `/unauthorized`
- Sidebar renders correct nav items per role

**Tasks:**
1. Run `npm install` in `frontend/`; run `npm run dev` — confirm Vite serves on port 5173 with no compile errors
2. Test login flow in browser — enter owner credentials; confirm redirect to `/owner/dashboard`; open DevTools → Application → confirm NO tokens in localStorage or sessionStorage
3. Test login failure — wrong password → red error message displays; form remains usable
4. Test force-password-change redirect — log in as a new user (default password); confirm redirect to `/change-password`; complete flow; confirm redirect to `/dashboard`
5. Test `ProtectedRoute` — navigate to `/dashboard` without logging in → redirected to `/login`
6. Test `RoleRoute` — log in as Employee; manually navigate to `/owner/dashboard` → redirected to `/unauthorized`
7. Verify Sidebar renders correct nav links for each role — log in as Owner, Employee, Manager; confirm nav items match `SIDEBAR_NAV` config
8. Fix any TypeScript errors in `frontend/src/` that appear after `npm run dev`; run `npm run lint` and fix all reported issues

**Dependencies:** M-03 complete (backend auth must work)

**Validation:**
- Login → redirect works for all 3 roles
- Token is NOT in localStorage (check DevTools)
- `ProtectedRoute` and `RoleRoute` both redirect correctly

**Risks:**
- `auth.store.ts` uses React Context — ensure `AuthProvider` wraps `RouterProvider` in `App.tsx` (ordering matters)
- Vite path alias for `@soumya/shared` must be configured in `vite.config.ts`

---

## M-10 — Frontend: Employee Screens

**Objective:** Employee can fully manage their own timecards (single + bulk), leaves (with balance widget), and view their calendar — all with real API data.

**Deliverables:**
- `MyTimecard` (S-04): list, add single, add bulk with preview, edit, delete timecards; same for overtime
- `MyLeave` (S-05): list, apply single + bulk, balance widget showing live forecast, edit, delete
- `MyCalendar` (S-06): monthly grid with color-coded day cells and legend
- `Dashboard` (S-03): employee stats for current month

**Tasks:**
1. Implement `TimecardList.tsx` — table with columns: date, work log, status badge, edit/delete buttons (disabled for non-applied); connect to `useTimecards` hook
2. Implement `TimecardForm.tsx` — single mode: date picker + work log textarea; bulk mode: start date, end date, work log; Zod validation via React Hook Form
3. Implement `BulkPreview.tsx` — shown after bulk form submit and before confirm; display "X days will be created, Y skipped"; calculate locally using `expandDateRange` from `frontend/utils/date-utils.ts`
4. Implement `OvertimeList.tsx` and `OvertimeForm.tsx` — same pattern as timecards; form includes `hours` number input; display `payout` in list (read-only, from API)
5. Assemble `MyTimecard.tsx` page — `MonthPaginator`, `TimecardList`, `TimecardForm` (in a dialog/panel), `OvertimeList`, `OvertimeForm`
6. Implement `LeaveBalanceWidget.tsx` — bar showing `total_credited`, `used`, `remaining`; add "forecast" row; connect to `useLeaveBalance`
7. Implement `LeaveList.tsx` and `LeaveForm.tsx` — same list pattern; form includes reason; bulk form with date range
8. Assemble `MyLeave.tsx` page — `MonthPaginator`, `LeaveBalanceWidget`, `LeaveList`, `LeaveForm`
9. Implement `AttendanceCalendar.tsx` — monthly grid (7 columns); color-code each day: `timecard-applied` (yellow), `timecard-approved` (green), `leave-applied` (blue light), `leave-approved` (blue dark), `holiday` (gray), `sunday` (light gray), no-entry (white)
10. Implement `CalendarLegend.tsx` — row of color + label pairs matching calendar colors
11. Assemble `MyCalendar.tsx` page; implement `Dashboard.tsx` employee stats view

**Dependencies:** M-09 complete

**Validation:**
- Create a timecard → appears in list immediately (TanStack Query cache invalidation)
- Delete applied leave → balance widget updates immediately
- Sunday dates are grayed out and unselectable in date pickers
- Calendar legend matches actual cell colors

**Risks:**
- Date picker must disable Sundays and known holidays — fetch holidays from `useSystemConfig` hook and pass as `disabledDates` to the picker
- `BulkPreview` local calculation must match backend's `expandDateRange` — import from `frontend/utils/date-utils.ts` which has the same logic

---

## M-11 — Frontend: Manager Approval Screens

**Objective:** Manager can see their team's pending timecards and leaves, and approve or reject them with a single click and confirmation dialog.

**Deliverables:**
- `TimecardApproval` (S-07): pending timecard table with approve/reject per row
- `LeaveApproval` (S-08): pending leave table with approve/reject per row
- Confirmation dialog before approve and reject
- Post-mutation cache invalidation

**Tasks:**
1. Implement `ApprovalRow.tsx` — single row component: employee name, employee ID, date, work log/reason, status badge, approve button, reject button; both buttons show `ConfirmDialog` before firing mutation
2. Implement `ApprovalTable.tsx` — wraps `ApprovalRow` list; shows `EmptyState` when queue is empty; accepts `items`, `type` (`timecard | leave`), and `onProcess` callback
3. Assemble `TimecardApproval.tsx` page (S-07) — connect `useTimecardApprovals` and `useProcessTimecardApproval`; wire `ApprovalTable`
4. Assemble `LeaveApproval.tsx` page (S-08) — connect `useLeaveApprovals` and `useProcessLeaveApproval`; wire `ApprovalTable`
5. Verify cache invalidation — approve a timecard; confirm it disappears from the queue without page refresh

**Dependencies:** M-10 complete (Employee screens must be done so there are timecards and leaves in the DB to approve)

**Validation:**
- Manager queue shows only their team's records
- Approve → row disappears from queue immediately
- Confirm dialog blocks accidental approval

**Risks:** None specific — pattern is established from earlier components

---

## M-12 — Frontend: Owner — User Management

**Objective:** Owner can list all users, create new users with auto-generated employee ID, edit existing users, and deactivate them.

**Deliverables:**
- `UserManagement` (S-13): full user list table with edit + deactivate actions
- `CreateUser` (S-14): form with all fields; Aadhaar 12-digit validation; role dropdown blocks 'owner'
- `EditUser` (S-15): same form, pre-populated; employee_id and date_of_joining read-only

**Tasks:**
1. Implement `UserForm.tsx` — all fields: full name, role (manager|employee), sex, date of birth, date of joining (read-only in edit mode), manager selector (dropdown of active managers), Aadhaar (12 digits, validated); `isEdit` prop controls which fields are read-only
2. Implement `UserTable.tsx` — columns: employee ID, name, role, manager, joined date, active status, edit/deactivate action buttons
3. Assemble `CreateUser.tsx` page — connect `useCreateUser`; on success redirect to `/owner/users`; display generated `employee_id` from API response
4. Assemble `EditUser.tsx` page — fetch user with `useUser(id)`; connect `useUpdateUser(id)`; display role-downgrade error inline if API returns `LINKED_EMPLOYEES`
5. Assemble `UserManagement.tsx` page — connect `useUsers`; wire `UserTable`; add "Add User" button linking to `/owner/users/new`

**Dependencies:** M-09 complete

**Validation:**
- Aadhaar field rejects non-12-digit input before submit
- Role dropdown has only `manager` and `employee` — no `owner` option
- Role downgrade with linked employees shows error message inline
- Created user's `employee_id` displayed in success state

**Risks:**
- Manager selector in UserForm must fetch from `GET /users/reportable` or filtered user list

---

## M-13 — Frontend: Owner — System Config, Team Calendar, Dashboard

**Objective:** Owner can configure system settings and holidays; view the full team calendar; see pending approval counts on their dashboard.

**Deliverables:**
- `SystemConfig` (S-16): annual leave + OT rate editable; holidays list add/remove rows
- `TeamCalendar` (S-12): same calendar grid, user selector dropdown
- `OwnerDashboard` (S-09): pending timecard count + pending leave count cards

**Tasks:**
1. Implement `SystemConfig.tsx` — pre-populate from `useSystemConfig`; annual leave days (number input), OT rate (number input); holidays list (dynamic rows: date + name + remove button); add row button; `useSaveConfig` on submit; confirm dialog before save
2. Implement `UserSelector.tsx` — dropdown of all users (from `useUsers`); on change updates `selectedUserId` in parent
3. Assemble `TeamCalendar.tsx` page — `UserSelector` at top; `MonthPaginator`; `AttendanceCalendar` fed by `useCalendarData(year, month, selectedUserId)`; `CalendarLegend`
4. Implement `OwnerDashboard.tsx` — two stat cards: "Pending Timecards" and "Pending Leaves" (counts from `useDashboard`); each card links to the relevant approval screen

**Dependencies:** M-10 complete (for calendar component reuse); M-12 complete (UserSelector needs user list)

**Validation:**
- Save config → verify changed values persist (refetch via GET)
- Holiday rows: add → appears in list; remove → gone; save → GET returns updated holiday list
- Team calendar switches user correctly on selector change

**Risks:**
- `PUT /config` fully replaces holidays — if user saves with empty holidays, all holidays are removed; add a warning if holidays list is empty

---

## M-14 — Testing Pass

**Objective:** Critical business logic covered by unit tests; happy-path and error-path for core endpoints covered by integration tests; key frontend form validations covered by component tests.

**Deliverables:**
- Backend unit tests for `date-utils` and `employee-id` passing
- Backend integration tests for auth, timecards, leaves covering happy + error paths
- Frontend component tests for `LeaveForm`, `LeaveBalanceWidget`, `UserForm`
- Frontend utility tests for `date-utils`
- `npm run test` passes across all workspaces

**Tasks:**
1. Complete `backend/tests/unit/utils/date-utils.test.ts` — add edge cases: multi-day range all Sundays (returns empty), range with holiday + Sunday, single-day valid date
2. Complete `backend/tests/unit/utils/employee-id.test.ts` — add: sequence 0 (SE_5000), large sequence (SE_5999)
3. Create `backend/tests/unit/services/leave.service.test.ts` — mock repositories; test: insufficient balance throws `AppError`; bulk apply skips existing dates; delete restores balance via `restoreBalance` call
4. Create `backend/tests/unit/services/timecard.service.test.ts` — mock repositories and configRepository; test: Sunday rejected; holiday rejected; duplicate rejected; bulk creates only new dates
5. Complete `backend/tests/integration/timecards.test.ts` — full CRUD, bulk, Sunday rejection, holiday rejection, duplicate rejection, IDOR (another user's ID → 404)
6. Complete `backend/tests/integration/leaves.test.ts` — apply, bulk, insufficient balance, delete + balance restore, approve + reject via approvals endpoint
7. Complete `backend/tests/integration/auth.test.ts` — login success, login fail, change password, force-password-change gate
8. Create `frontend/tests/components/LeaveForm.test.tsx` — render form; submit with no dates → validation error; submit with valid data → `onSubmit` called
9. Create `frontend/tests/components/LeaveBalanceWidget.test.tsx` — renders total/used/remaining correctly
10. Create `frontend/tests/components/UserForm.test.tsx` — Aadhaar input with 11 digits → validation error on submit; role dropdown does not contain 'owner' option
11. Run `npm run test` at root; fix all failing tests; confirm exit 0

**Dependencies:** M-08 complete (all backend routes wired); M-13 complete (all frontend components exist)

**Validation:**
- `npm run test --workspaces --if-present` exits 0
- No `any` types used in test files
- Integration tests hit real local Supabase (not mocked)

**Risks:**
- Integration test setup requires a reset mechanism to avoid polluting dev data — consider using `supabase db reset` before test run
- `jest.mock` for Supabase client in unit tests must be careful not to import real client during mock setup

---

## M-15 — Deployment & Go-Live Preparation

**Objective:** Application deployed to production infrastructure; environment secured; go-live checklist complete.

**Deliverables:**
- Production Supabase project configured (Pro plan, pg_cron enabled)
- Backend deployed to Railway with env vars set
- Frontend deployed to Vercel with env vars set
- GitHub Actions CI pipeline runs tests on every push to `main`
- Owner account seeded in production
- Go-live checklist verified

**Tasks:**
1. Create production Supabase project (Pro plan); enable `pg_cron` and `pg_crypto` extensions from Dashboard → Extensions; note all 5 production credentials
2. Create production env vars for backend in Railway dashboard; generate a new 32-char `X_CRON_SECRET` for production; do NOT commit any production secrets
3. Deploy backend to Railway — create Railway project; connect GitHub repo; set root directory to `backend/`; confirm `npm run start` boots and Flyway migrations run against production DB; set `NIXPACKS_JDK_VERSION=17` for Java
4. Seed production owner — run one-time script locally pointing at production `DATABASE_URL` to call `supabase.auth.admin.createUser` and insert `users` + `leave_balance` rows
5. Create GitHub Actions workflow `.github/workflows/ci.yml` — triggers on push to `main` and all PRs; jobs: `lint` (all workspaces), `test:unit` (backend unit), `test:frontend` (vitest); does NOT run integration tests in CI (requires Supabase)
6. Deploy frontend to Vercel — connect GitHub repo; set framework to Vite; set root directory to `frontend/`; set `VITE_API_BASE_URL` to Railway backend URL
7. End-to-end smoke test on production — log in as owner; create one manager user; create one employee under that manager; log in as employee (default password), change password; log timecard; log leave; log out as employee; log in as manager; approve timecard and leave; log in as owner; verify approval counts on dashboard; verify team calendar shows the approved records

**Dependencies:** All M-01 through M-14 complete

**Validation:**
- Railway backend responds to `GET /api/v1/config` from the internet
- Vercel frontend loads login page at the production URL
- All 7 smoke test steps pass without error
- GitHub Actions CI passes on the main branch

**Risks:**
- Railway free tier cold-starts — upgrade to paid plan if response time is unacceptable
- `node-flyway` requires Java on the Railway container — add `NIXPACKS_JDK_VERSION=17` env var in Railway to ensure Java is installed during build
- pg_cron will silently no-op if not on Supabase Pro — verify the cron job is listed in `cron.job` table after production setup
- Production owner credentials must be stored securely (password manager) — they cannot be recovered from the DB (only reset via Supabase Admin)

---

## Milestone Dependency Graph

```
M-01 (Bootstrap)
  └─ M-02 (Migrations)
       └─ M-03 (Auth Backend)
            ├─ M-04 (Timecards API)
            │    └─ M-05 (Leaves API)
            │         └─ M-07 (Approvals API)
            ├─ M-06 (Overtime API)          ← parallel with M-04/M-05
            └─ M-08 (Users/Config/Cal/Dash) ← parallel with M-04–M-07
M-03
  └─ M-09 (Frontend Auth)
       ├─ M-10 (Employee Screens)
       │    └─ M-11 (Manager Approvals)
       └─ M-12 (Owner Users)
            └─ M-13 (Owner Config/Cal/Dash)

All backend (M-03–M-08) + All frontend (M-09–M-13)
  └─ M-14 (Testing Pass)
       └─ M-15 (Deployment)
```

---

## Estimated Session Count

| Milestone | APPLY Sessions |
|-----------|---------------|
| M-01 | 3–4 |
| M-02 | 3–4 |
| M-03 | 3–4 |
| M-04 | 4–5 |
| M-05 | 4–5 |
| M-06 | 2–3 |
| M-07 | 3–4 |
| M-08 | 4–5 |
| M-09 | 3–4 |
| M-10 | 5–6 |
| M-11 | 2–3 |
| M-12 | 3–4 |
| M-13 | 2–3 |
| M-14 | 5–6 |
| M-15 | 4–5 |
| **Total** | **~52–65 sessions** |
