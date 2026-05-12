# 01 — Use Cases
## Soumya Electricals — Workforce Management System

---

## Problem Statement

Soumya Electricals currently tracks employee attendance, leave, and overtime through manual paper records or informal spreadsheets. This leads to: errors in leave balance calculations, delays in approvals, no audit trail for attendance disputes, and no visibility for the owner into pending approvals without physically collecting records from managers.

This application replaces all manual tracking with a structured digital system that enforces business rules automatically, maintains an audit trail via status history, and gives each role the right level of visibility.

---

## User Roles

### Owner
- Single superuser account for the business proprietor
- Full visibility across all employees, all approval queues, all data
- Manages user accounts (create, edit, deactivate)
- Configures system settings: annual leave quota, overtime pay rate, holiday calendar
- **Cannot be created via the UI** — seeded once via database migration (V8)
- Employee ID: `SE_5000` (reserved)

### Manager
- Approves or rejects timecards and leave applications from their directly assigned employees
- Is themselves an employee — can log their own timecards, overtime, and leave
- Visibility scoped to their own records plus their direct reports' pending items
- Cannot see other managers' teams' records
- Cannot create or manage user accounts

### Employee
- Logs daily attendance (timecards) and work descriptions
- Applies for leave (deducted from their annual balance)
- Logs overtime hours (payout calculated automatically)
- Views their own attendance calendar and leave balance
- Cannot see any other employee's records
- Cannot approve anything

---

## Use Cases

### UC-01: Login
- **Actor:** All roles
- **Trigger:** User navigates to the application and enters Employee ID + password
- **Flow:** Enter Employee ID (e.g., `SE_5001`) → Enter password → System authenticates via Supabase Auth using synthetic email → JWT issued → Redirect by role: Owner → `/owner/dashboard`, Employee/Manager → `/dashboard`
- **Alt flow:** If `is_default_password = true` → redirect to `/change-password` regardless of role
- **Error:** Wrong credentials → `401 Invalid employee ID or password`

### UC-02: Change Default Password
- **Actor:** All roles (on first login)
- **Trigger:** `is_default_password` flag is `true` on the user's account
- **Precondition:** User is authenticated but `is_default_password = true`; all routes except `/auth/change-password` return `403 FORCE_PASSWORD_CHANGE`
- **Flow:** Enter current password (`12345678`) → Enter new password (min 8 chars) → System updates Supabase Auth password → Sets `is_default_password = false` → Redirect to role dashboard
- **Error:** Wrong current password → `401`

### UC-03: Log Single Timecard
- **Actor:** Employee, Manager (for their own record)
- **Trigger:** Employee clicks "Add Timecard" on the My Timecard screen
- **Flow:** Select date → Enter work description → Submit
- **Business rules:** Date cannot be a Sunday; date cannot be a configured holiday; user cannot have an existing timecard for the same date
- **Success:** Timecard created with `status = 'applied'`
- **Error:** Sunday → `400 INVALID_DATE`; Holiday → `400 INVALID_DATE`; Duplicate → `409 DUPLICATE`

### UC-04: Log Bulk Timecards
- **Actor:** Employee, Manager
- **Trigger:** Employee selects "Bulk Add" mode on the My Timecard screen
- **Flow:** Select start date → Select end date → Enter work description → Preview screen shows "X days will be created, Y skipped" → Confirm
- **Business rules:** Sundays and configured holidays auto-excluded from the range; dates with existing timecards silently skipped (not an error); at least one valid date must exist in range
- **Preview calculation:** Done client-side using same `expandDateRange` logic as backend

### UC-05: Edit Timecard
- **Actor:** Employee, Manager (own records)
- **Precondition:** Timecard has `status = 'applied'` (approved timecards cannot be edited)
- **Flow:** Click Edit on a timecard row → Edit work description → Submit
- **Error:** Editing approved timecard → `400 UNEDITABLE`

### UC-06: Delete Timecard
- **Actor:** Employee, Manager (own records)
- **Precondition:** Timecard has `status = 'applied'`
- **Flow:** Click Delete → Confirm dialog → Delete
- **Error:** Deleting approved timecard → `400 UNEDITABLE`

### UC-07: Log Overtime
- **Actor:** Employee, Manager
- **Flow:** Select date → Enter hours → Enter work description → Submit
- **Business rules:** Same date exclusion rules as timecards (no Sunday, no holiday); payout = `hours × system_config.overtime_rate_per_hour` at time of creation
- **Note:** If the OT rate is changed via system config after submission but before approval, the payout recalculates at the current rate on edit (not at approval time)

### UC-08: Edit / Delete Overtime
- **Actor:** Employee, Manager (own records)
- **Precondition:** Overtime has `status = 'applied'`
- **Edit:** Updates hours and work log; payout recalculates at **current** OT rate
- **Delete:** `status = 'applied'` required; no balance restoration needed

### UC-09: Apply Single Leave
- **Actor:** Employee, Manager
- **Flow:** Select date → Enter reason → Submit
- **Business rules:** Date cannot be Sunday or holiday; user cannot have existing leave on the same date; `leave_balance.remaining` must be ≥ 1; balance deducted immediately on submission
- **Error:** Insufficient balance → `400 INSUFFICIENT_BALANCE` with current remaining shown

### UC-10: Apply Bulk Leave
- **Actor:** Employee, Manager
- **Flow:** Select start date → Select end date → Enter reason → Preview "X days will be applied, Y skipped" → Confirm
- **Business rules:** Sundays and holidays auto-excluded; existing leave dates silently skipped; `remaining` balance must cover ALL new (non-skipped) days in full before insert; balance deducted atomically via `deduct_leave_balance` stored proc

### UC-11: Edit Leave
- **Actor:** Employee, Manager (own records)
- **Precondition:** Leave has `status = 'applied'`
- **Flow:** Edit reason only (date cannot change); Submit
- **Note:** Balance is NOT affected by editing reason

### UC-12: Delete Leave
- **Actor:** Employee, Manager (own records)
- **Precondition:** Leave has `status = 'applied'`
- **Flow:** Click Delete → Confirm dialog → Delete
- **Balance rule:** Balance is **restored by 1** via `restore_leave_balance` stored proc on successful delete

### UC-13: View Attendance Calendar
- **Actor:** Employee (own calendar); Manager (own + team); Owner (any user)
- **Flow:** Navigate to calendar → Select month using MonthPaginator → View monthly grid
- **Day colour codes:**
  - Approved timecard → Green
  - Applied timecard → Yellow
  - Applied leave → Blue (light)
  - Approved leave → Blue (dark)
  - Holiday → Gray
  - Sunday → Light gray
  - No record → White
- **Manager/Owner:** User selector dropdown to switch the viewed employee

### UC-14: Approve or Reject Timecard (Manager)
- **Actor:** Manager
- **Flow:** Navigate to Timecard Approvals → View pending queue (only own team's records) → Click Approve or Reject → Confirm dialog → Submit
- **Business rules:** Only records with `status = 'applied'` appear in queue; atomic `UPDATE WHERE status='applied' RETURNING id` — race condition safe; once approved, record is locked (cannot be edited or deleted by employee)
- **Error:** Already processed → `409 CONFLICT`

### UC-15: Approve or Reject Leave (Manager)
- **Actor:** Manager
- **Flow:** Same as UC-14 but for leave queue
- **Balance rule:** Approve → no balance change (balance was already deducted on application); Reject → balance restored via `reject_leave` stored proc

### UC-16: Approve / Reject Timecards — Owner
- **Actor:** Owner
- **Flow:** Same approval flow as Manager but queue shows ALL employees' pending timecards, not scoped to a team
- **Note:** Owner can approve timecards that belong to employees of any manager, including managers' own timecards

### UC-17: Approve / Reject Leaves — Owner
- **Actor:** Owner
- **Flow:** Same as UC-16 but for leaves

### UC-18: View Dashboard
- **Actor:** Employee, Manager → shows own stats; Owner → shows system-wide pending counts
- **Employee/Manager view:** Timecards this month, Leave days used this month, Leave balance remaining
- **Owner view:** Total pending timecards (all employees), Total pending leaves (all employees)

### UC-19: Create User
- **Actor:** Owner
- **Flow:** Navigate to User Management → Add User → Fill form → Submit
- **Fields:** Full name, role (manager|employee only — owner blocked), sex, date of birth, date of joining, Aadhaar (12 digits), manager assignment (optional)
- **Auto-generated:** Employee ID (next in sequence: `SE_5001`, `SE_5002`, …); default password `12345678`; `leave_balance` row created with `remaining = annual_leave_days` from system config
- **Supabase Auth:** User created in Auth with synthetic email `<employee_id>@soumyaelectricals.internal`

### UC-20: Edit User
- **Actor:** Owner
- **Editable fields:** Full name, role, sex, date of birth, manager assignment, active status
- **Read-only fields:** Employee ID, date of joining, Aadhaar
- **Business rule:** Cannot change role from Manager → Employee if the manager has linked active employees; error message: "First remove or reassign their linked employees"

### UC-21: Deactivate User
- **Actor:** Owner
- **Flow:** Toggle `is_active = false` on the user via Edit User
- **Effect:** User can no longer log in (Supabase Auth disabled or rejected at the middleware level via `is_active` check)

### UC-22: Configure System Settings
- **Actor:** Owner
- **Flow:** Navigate to System Config → Edit annual leave days, OT rate per hour, holiday list (add/remove rows) → Save
- **Holiday list:** Full replacement on save (old list deleted, new list inserted atomically)
- **Effect on existing records:** OT payout recalculates at current rate on next edit; leave balance is not retroactively adjusted when annual_leave_days changes

---

## Screen Inventory

| ID | Screen Name | Accessible By | Primary Actions |
|----|-------------|---------------|-----------------|
| S-01 | Login | All (unauthenticated) | Submit credentials |
| S-02 | Change Password | All (when default password active) | Change password |
| S-03 | Employee Dashboard | Employee, Manager | View monthly stats + leave balance |
| S-04 | My Timecard | Employee, Manager | Add/edit/delete timecards + overtime |
| S-05 | My Leave | Employee, Manager | Apply/edit/delete leaves; view balance |
| S-06 | My Calendar | Employee, Manager | View monthly attendance grid |
| S-07 | Timecard Approval | Manager | Approve/reject team timecards |
| S-08 | Leave Approval | Manager | Approve/reject team leaves |
| S-09 | Owner Dashboard | Owner | View system-wide pending counts |
| S-10 | Manager Timecard Approval | Owner | Approve/reject all employee timecards |
| S-11 | Manager Leave Approval | Owner | Approve/reject all employee leaves |
| S-12 | Team Calendar | Owner | View any user's monthly calendar |
| S-13 | User Management | Owner | List all users; deactivate |
| S-14 | Create User | Owner | Create new employee/manager account |
| S-15 | Edit User | Owner | Edit user details; role management |
| S-16 | System Config | Owner | Set leave quota, OT rate, holidays |

---

## Navigation Model

```
Unauthenticated
  └─ /login (S-01)
       └─ [if is_default_password = true] → /change-password (S-02)
       └─ [Employee/Manager] → /dashboard (S-03)
       └─ [Owner] → /owner/dashboard (S-09)

Employee / Manager sidebar:
  /dashboard        (S-03)
  /my-timecard      (S-04)
  /my-leave         (S-05)
  /my-calendar      (S-06)
  [Manager only:]
  /approvals/timecards  (S-07)
  /approvals/leaves     (S-08)

Owner sidebar:
  /owner/dashboard              (S-09)
  /owner/approvals/timecards    (S-10)
  /owner/approvals/leaves       (S-11)
  /owner/calendar               (S-12)
  /owner/users                  (S-13)
  /owner/users/new              (S-14)
  /owner/users/:id/edit         (S-15)
  /owner/config                 (S-16)
```

**Route protection:**
- `ProtectedRoute` — redirects unauthenticated users to `/login`
- `RoleRoute` — redirects wrong-role users to `/unauthorized`
- `forcePasswordChange` middleware — redirects all requests to `/change-password` if `is_default_password = true`

---

## Business Rules

| ID | Rule |
|----|------|
| BR-01 | Timecards and leave cannot be logged on Sundays |
| BR-02 | Timecards and leave cannot be logged on configured holidays |
| BR-03 | Only one timecard per employee per date (unique constraint) |
| BR-04 | Only one leave record per employee per date (unique constraint) |
| BR-05 | Leave balance must cover all new days in a bulk application before any row is inserted |
| BR-06 | Leave balance is deducted immediately on application (not on approval) |
| BR-07 | Leave balance is restored immediately on delete of an applied leave |
| BR-08 | Leave balance is restored when a manager rejects a leave |
| BR-09 | Leave balance is NOT restored when a manager approves a leave |
| BR-10 | Approved timecards, leaves, and overtime cannot be edited or deleted by employees |
| BR-11 | Overtime payout = `hours × current_system_rate_per_hour`; recalculates at edit time |
| BR-12 | Employee ID format: `SE_` followed by a 4-digit number starting from 5000 |
| BR-13 | Owner Employee ID is `SE_5000`, reserved; employee sequence starts at 5001 |
| BR-14 | Default password for all new users is `12345678`; must be changed on first login |
| BR-15 | Owner role cannot be assigned via the Create/Edit User API; blocked by Zod schema |
| BR-16 | A Manager's role cannot be changed to Employee if they have active linked employees |
| BR-17 | Manager approval queue shows only their direct reports' records |
| BR-18 | Owner approval queue shows all employees' records regardless of manager |
| BR-19 | Approval is atomic: `UPDATE WHERE status='applied' RETURNING id` prevents double-approval |
| BR-20 | Annual leave credit runs automatically at midnight IST on the 1st of each month |
| BR-21 | Holiday list is fully replaced (not appended) when system config is saved |

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Bulk timecard range that is entirely Sundays/holidays | API returns `{ created: [], skipped: N }` — not an error |
| Bulk leave range where balance covers partial dates only | Entire request rejected; no partial insert |
| Two managers simultaneously approve the same timecard | First write wins (`200`); second receives `409 CONFLICT` |
| Employee deletes an approved leave | `400 UNEDITABLE` — cannot delete approved records |
| Owner changes OT rate after an overtime entry is submitted | Existing entries retain old payout until employee edits them; no automatic recalculation |
| Manager is deactivated while employees are still linked to them | Employees retain the `manager_id` foreign key; they simply have no active approver until the owner reassigns them |
| Employee applies leave on a holiday that is later removed from config | The leave record remains valid; no retroactive change |
| User navigates directly to `/owner/dashboard` as Employee | `RoleRoute` redirects to `/unauthorized` |
| Leave balance goes to zero after annual credit is processed | Balance can only grow; it cannot go negative (DB function raises exception) |

---

## Open Questions

| # | Question | Status |
|---|----------|--------|
| OQ-01 | Should deactivated users' historical records (timecards, leaves) remain visible to the owner? | **Assumed yes** — `is_active` only affects login, not data visibility |
| OQ-02 | If annual_leave_days changes in system config, should existing employees' balances be retroactively adjusted? | **Assumed no** — change applies only to future monthly credits |
| OQ-03 | Should managers be able to see approved (not just pending) timecards for their team? | **Assumed no** — approval screens show only `status='applied'` records |
| OQ-04 | Is there a maximum timecard date range for bulk creation? | **Assumed 31 days** — enforced by `MAX_DATE_RANGE_DAYS = 31` constant |
| OQ-05 | Should the owner be notified (email/push) when a new approval is pending? | **Out of scope for v1** — dashboard counts serve as the only notification mechanism |
