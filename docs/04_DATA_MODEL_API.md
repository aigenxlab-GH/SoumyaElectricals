# 04 — Data Model & API Reference
## Soumya Electricals — Workforce Management System

---

## Database Overview

**7 tables** in a single PostgreSQL database (Supabase managed).

| Table | Purpose | Row count estimate |
|-------|---------|-------------------|
| `users` | All employees, managers, and the owner | 10–50 |
| `timecards` | Daily attendance records (one per employee per date) | ~500–2,000/year |
| `overtime` | Overtime entries with payout | ~100–500/year |
| `leaves` | Leave applications (one per employee per date) | ~200–1,000/year |
| `leave_balance` | Single cumulative balance row per user | 10–50 (1:1 with users) |
| `system_config` | Global settings — single row always | 1 (upsert only) |
| `holidays` | Configured public holidays | 10–20/year |

---

## Custom PostgreSQL Enums

Defined in `V1__create_enums.sql`:

```sql
CREATE TYPE user_role     AS ENUM ('owner', 'manager', 'employee');
CREATE TYPE record_status AS ENUM ('applied', 'approved', 'rejected');
CREATE TYPE sex_type      AS ENUM ('male', 'female', 'other');
```

---

## Table Schemas

### `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, FK → `auth.users(id)` ON DELETE CASCADE | Supabase Auth UUID |
| `employee_id` | TEXT | NOT NULL, UNIQUE | `SE_5000` (owner), `SE_5001+` (employees) |
| `full_name` | TEXT | NOT NULL | |
| `role` | user_role | NOT NULL | `owner` \| `manager` \| `employee` |
| `sex` | sex_type | NOT NULL | `male` \| `female` \| `other` |
| `date_of_birth` | DATE | NOT NULL | |
| `date_of_joining` | DATE | NOT NULL | Read-only after creation |
| `aadhaar` | TEXT | NOT NULL | 12-digit Indian national ID; never logged; owner-only field |
| `manager_id` | UUID | FK → `users(id)` ON DELETE SET NULL | NULL for owner and unassigned employees |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | FALSE → login blocked |
| `is_default_password` | BOOLEAN | NOT NULL, DEFAULT TRUE | Triggers force-password-change gate |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by `set_updated_at` trigger |

---

### `timecards`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE | |
| `date` | DATE | NOT NULL | |
| `work_log` | TEXT | NOT NULL | Attendance description |
| `status` | record_status | NOT NULL, DEFAULT `'applied'` | `applied` → editable; `approved` → locked |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| | | UNIQUE (user_id, date) | One record per employee per day |

---

### `overtime`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE | |
| `date` | DATE | NOT NULL | |
| `hours` | NUMERIC(4,2) | NOT NULL, CHECK (hours > 0 AND hours <= 24) | |
| `payout` | NUMERIC(10,2) | NOT NULL | Stored at submission time; recalculates on edit |
| `work_log` | TEXT | NOT NULL | |
| `status` | record_status | NOT NULL, DEFAULT `'applied'` | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `leaves`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE | |
| `date` | DATE | NOT NULL | |
| `reason` | TEXT | NOT NULL | Editable while status = `applied` |
| `status` | record_status | NOT NULL, DEFAULT `'applied'` | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| | | UNIQUE (user_id, date) | One leave per employee per day |

---

### `leave_balance`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, UNIQUE, FK → `users(id)` ON DELETE CASCADE | One row per user |
| `total_credited` | INTEGER | NOT NULL, DEFAULT 0 | Cumulative days credited since account creation |
| `used` | INTEGER | NOT NULL, DEFAULT 0 | Days currently in `applied` or `approved` status |
| `remaining` | INTEGER | NOT NULL, DEFAULT 0 | Available days; must stay ≥ 0 (enforced by stored proc) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Balance lifecycle:**
- Created with `remaining = system_config.annual_leave_days` at user creation
- Decremented by `deduct_leave_balance()` on leave application
- Restored by `restore_leave_balance()` on delete or `reject_leave()` on manager reject
- Incremented by pg_cron job at end of each month

---

### `system_config`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Single row; always upserted, never inserted twice |
| `annual_leave_days` | INTEGER | NOT NULL, DEFAULT 21 | Days credited per month via pg_cron |
| `overtime_rate_per_hour` | NUMERIC(8,2) | NOT NULL, DEFAULT 100.00 | INR rate; used at time of OT creation and re-edit |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

---

### `holidays`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `date` | DATE | NOT NULL, UNIQUE | |
| `name` | TEXT | NOT NULL | Display label (e.g., "Diwali") |

**Holiday list is fully replaced on each `PUT /config` call** — all rows deleted, new rows inserted in one transaction.

---

## Entity Relationships

```
auth.users (Supabase)
    │ 1:1 (id)
    ▼
users
    │ 1:1 (user_id)   → leave_balance
    │ 1:N (user_id)   → timecards
    │ 1:N (user_id)   → overtime
    │ 1:N (user_id)   → leaves
    │ self FK (manager_id → id)  ← manager/employee relationship

system_config  (single row; no FK relationships)
holidays       (standalone; fetched by service layer for date validation)
```

---

## Stored Procedures

Defined in `V5__create_functions.sql`:

| Procedure | Signature | Purpose |
|-----------|-----------|---------|
| `approve_leave` | `(p_leave_id UUID) → leave row` | Sets status = 'approved'; raises exception if already processed |
| `reject_leave` | `(p_leave_id UUID) → leave row` | Sets status = 'rejected' AND restores balance by 1; atomic |
| `deduct_leave_balance` | `(p_user_id UUID, p_days INT)` | Decrements remaining; raises exception if remaining < p_days |
| `restore_leave_balance` | `(p_user_id UUID, p_days INT)` | Increments remaining; used on leave delete |
| `next_employee_id_seq` | `() → INTEGER` | Returns `nextval('employee_id_seq')`; used in user.service.ts |
| `set_updated_at` | trigger function | Updates `updated_at = NOW()` on row update; attached to all tables |

**Timecard approval** does not use a stored proc — the repository layer uses:
```sql
UPDATE timecards SET status = 'approved' WHERE id = p_id AND status = 'applied' RETURNING *
```
If 0 rows returned → throws AppError 409 CONFLICT.

---

## Indexes

Defined in `V3__create_indexes.sql`:

```sql
-- Foreign key indexes (prevent full-table scans on joins)
CREATE INDEX idx_timecards_user_id   ON timecards(user_id);
CREATE INDEX idx_overtime_user_id    ON overtime(user_id);
CREATE INDEX idx_leaves_user_id      ON leaves(user_id);
CREATE INDEX idx_users_manager_id    ON users(manager_id);

-- Status indexes (approval queue queries filter on status)
CREATE INDEX idx_timecards_status    ON timecards(status);
CREATE INDEX idx_overtime_status     ON overtime(status);
CREATE INDEX idx_leaves_status       ON leaves(status);

-- Composite indexes (monthly list queries filter by user + month)
CREATE INDEX idx_timecards_user_date ON timecards(user_id, date);
CREATE INDEX idx_overtime_user_date  ON overtime(user_id, date);
CREATE INDEX idx_leaves_user_date    ON leaves(user_id, date);
```

---

## API Reference

**Base URL:** `https://<railway-host>/api/v1`

All requests to protected endpoints require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

### Authentication

| # | Method | Path | Auth | Body | Success | Description |
|---|--------|------|------|------|---------|-------------|
| 1 | POST | `/auth/login` | None | `{ employee_id, password }` | 200 | Login; returns tokens + user |
| 2 | POST | `/auth/change-password` | JWT | `{ old_password, new_password }` | 200 | Change password; clears is_default_password |

**Rate limits:** Login: 10/min/IP · Change-password: 5/min/IP

---

### Timecards

| # | Method | Path | Auth | Body / Query | Success | Description |
|---|--------|------|------|--------------|---------|-------------|
| 3 | GET | `/timecards` | JWT | `?year=&month=` | 200 | List own timecards for month |
| 4 | POST | `/timecards` | JWT | `{ date, work_log }` | 201 | Create single timecard |
| 5 | POST | `/timecards/bulk` | JWT | `{ start_date, end_date, work_log }` | 201 | Bulk create; skips Sundays, holidays, duplicates |
| 6 | PATCH | `/timecards/:id` | JWT | `{ work_log }` | 200 | Update work log (applied only) |
| 7 | DELETE | `/timecards/:id` | JWT | — | 204 | Delete timecard (applied only) |

---

### Overtime

| # | Method | Path | Auth | Body / Query | Success | Description |
|---|--------|------|------|--------------|---------|-------------|
| 8 | GET | `/overtime` | JWT | `?year=&month=` | 200 | List own overtime for month |
| 9 | POST | `/overtime` | JWT | `{ date, hours, work_log }` | 201 | Create overtime; payout auto-calculated |
| 10 | PATCH | `/overtime/:id` | JWT | `{ hours?, work_log? }` | 200 | Update; payout recalculates at current rate |
| 11 | DELETE | `/overtime/:id` | JWT | — | 204 | Delete (applied only) |

---

### Leaves

| # | Method | Path | Auth | Body / Query | Success | Description |
|---|--------|------|------|--------------|---------|-------------|
| 12 | GET | `/leaves` | JWT | `?year=&month=` | 200 | List own leaves for month |
| 13 | GET | `/leaves/balance` | JWT | — | 200 | Get `{ total_credited, used, remaining }` |
| 14 | POST | `/leaves` | JWT | `{ date, reason }` | 201 | Apply single leave; deducts balance |
| 15 | POST | `/leaves/bulk` | JWT | `{ start_date, end_date, reason }` | 201 | Bulk apply; all-or-nothing balance check |
| 16 | PATCH | `/leaves/:id` | JWT | `{ reason }` | 200 | Update reason (applied only; no balance effect) |
| 17 | DELETE | `/leaves/:id` | JWT | — | 204 | Delete leave (applied only); restores balance by 1 |

---

### Approvals

Requires role: `manager` or `owner`. Manager sees only their direct reports; Owner sees all.

| # | Method | Path | Auth | Body | Success | Description |
|---|--------|------|------|------|---------|-------------|
| 18 | GET | `/approvals/timecards` | JWT + role | — | 200 | List pending timecards in scope |
| 19 | GET | `/approvals/leaves` | JWT + role | — | 200 | List pending leaves in scope |
| 20 | POST | `/approvals/timecards/:id` | JWT + role | `{ action: "approve" \| "reject" }` | 200 | Process timecard; atomic; 409 if already processed |
| 21 | POST | `/approvals/leaves/:id` | JWT + role | `{ action: "approve" \| "reject" }` | 200 | Process leave; reject restores balance; 409 if conflict |

---

### Users

Requires role: `owner` (except `/reportable` which requires `manager` or `owner`).

| # | Method | Path | Auth | Body | Success | Description |
|---|--------|------|------|------|---------|-------------|
| 22 | GET | `/users` | JWT + owner | — | 200 | List all users (aadhaar excluded) |
| 23 | GET | `/users/reportable` | JWT + manager/owner | — | 200 | List users reportable to the current manager |
| 24 | GET | `/users/:id` | JWT + owner | — | 200 | Get single user (aadhaar included for owner) |
| 25 | POST | `/users` | JWT + owner | `{ full_name, role, sex, date_of_birth, date_of_joining, aadhaar, manager_id? }` | 201 | Create user; auto-generates employee_id; creates Auth user + leave_balance |
| 26 | PATCH | `/users/:id` | JWT + owner | `{ full_name?, role?, sex?, date_of_birth?, manager_id?, is_active? }` | 200 | Update user; role downgrade blocked if linked employees |

---

### System Config

| # | Method | Path | Auth | Body | Success | Description |
|---|--------|------|------|------|---------|-------------|
| 27 | GET | `/config` | JWT | — | 200 | Get config `{ annual_leave_days, overtime_rate_per_hour, holidays[] }` |
| 28 | PUT | `/config` | JWT + owner | `{ annual_leave_days, overtime_rate_per_hour, holidays: [{ date, name }] }` | 200 | Replace config; fully replaces holiday list |

---

### Calendar

| # | Method | Path | Auth | Query | Success | Description |
|---|--------|------|------|-------|---------|-------------|
| 29 | GET | `/calendar` | JWT | `?year=&month=&user_id=` | 200 | Monthly attendance day-map for a user; `user_id` param requires manager/owner role |

**Response shape:**
```json
{
  "2024-01-15": { "type": "timecard", "status": "approved" },
  "2024-01-20": { "type": "leave", "status": "applied" },
  "2024-01-26": { "type": "holiday", "name": "Republic Day" }
}
```

---

### Dashboard

| # | Method | Path | Auth | Success | Description |
|---|--------|------|------|---------|-------------|
| 30 | GET | `/dashboard` | JWT | 200 | Role-aware stats: employee/manager sees own month stats; owner sees pending counts |

**Employee/Manager response:**
```json
{
  "timecards_this_month": 18,
  "leave_days_used_this_month": 2,
  "leave_balance_remaining": 19
}
```

**Owner response:**
```json
{
  "pending_timecards": 12,
  "pending_leaves": 3
}
```

---

## API Response Format

All responses follow a consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE",
    "message": "Timecards cannot be logged on Sundays.",
    "details": null
  }
}
```

**Validation error (422):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fieldErrors": {
        "date": ["Required"],
        "work_log": ["String must contain at least 1 character(s)"]
      }
    }
  }
}
```

---

## Error Code Reference

| HTTP | Code | When |
|------|------|------|
| 400 | `INVALID_DATE` | Timecard/leave/overtime submitted on Sunday or holiday |
| 400 | `UNEDITABLE` | Attempt to edit/delete an approved record |
| 400 | `INSUFFICIENT_BALANCE` | Leave apply when remaining balance < requested days |
| 400 | `LINKED_EMPLOYEES` | Role downgrade blocked (manager has active direct reports) |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 401 | `INVALID_CREDENTIALS` | Wrong employee_id or password on login |
| 403 | `FORBIDDEN` | Valid JWT but insufficient role |
| 403 | `FORCE_PASSWORD_CHANGE` | is_default_password = true; must change password first |
| 404 | (not found) | Resource does not exist or does not belong to the requesting user |
| 409 | `DUPLICATE` | Timecard/leave already exists for the same date |
| 409 | `CONFLICT` | Approval race condition — record was already processed |
| 422 | `VALIDATION_ERROR` | Zod schema validation failed; fieldErrors in details |
| 429 | (too many requests) | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled server exception |

---

## Open Questions

| # | Question | Status |
|---|----------|--------|
| OQ-01 | The `00_PROJECT_OVERVIEW.md` key numbers table says 34 API endpoints; the implemented routers yield 30. The delta may be explained by endpoints planned but not yet scaffolded (e.g. refresh-token endpoint, deactivate-user endpoint). Reconcile count during M-03 / M-08 implementation. | Open |
