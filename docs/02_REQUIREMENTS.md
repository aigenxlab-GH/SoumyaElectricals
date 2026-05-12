# 02 — Requirements
## Soumya Electricals — Workforce Management System

---

## Functional Requirements

### Authentication (FR-001 to FR-007)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-001 | The system shall allow any user to log in using their Employee ID and password | Login with valid credentials returns JWT access token, refresh token, and user object; status 200 |
| FR-002 | The system shall reject login attempts with invalid credentials | Wrong Employee ID or password returns `401` with code `INVALID_CREDENTIALS`; no information about which field is wrong |
| FR-003 | The system shall force a password change on first login | If `is_default_password = true`, all routes except `POST /auth/change-password` return `403 FORCE_PASSWORD_CHANGE` |
| FR-004 | The system shall allow a user to change their password | Providing correct current password and a new password (min 8 chars) updates Supabase Auth and sets `is_default_password = false` |
| FR-005 | The system shall rate-limit login attempts to 10 per minute per IP | The 11th login request within 60 seconds returns `429 Too Many Requests` |
| FR-006 | The system shall rate-limit password change attempts to 5 per minute per IP | The 6th change-password request within 60 seconds returns `429` |
| FR-007 | The system shall reject all API requests without a valid JWT | Any request to a protected endpoint without `Authorization: Bearer <token>` returns `401 UNAUTHORIZED` |

---

### Timecards (FR-008 to FR-018)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-008 | An employee shall be able to log a single timecard for a specific date | `POST /timecards` with valid date and work_log creates a row with `status='applied'`; returns `201` |
| FR-009 | An employee shall be able to log timecards in bulk for a date range | `POST /timecards/bulk` returns array of created timecards and count of skipped dates |
| FR-010 | The system shall reject timecards on Sundays | `POST /timecards` with a Sunday date returns `400 INVALID_DATE` |
| FR-011 | The system shall reject timecards on configured public holidays | `POST /timecards` with a holiday date returns `400 INVALID_DATE` |
| FR-012 | The system shall reject duplicate timecards for the same date | `POST /timecards` for a date where a timecard already exists returns `409 DUPLICATE` |
| FR-013 | Bulk timecard creation shall silently skip Sundays, holidays, and duplicate dates | Skipped dates appear in the `skipped` count in the response; no error is raised |
| FR-014 | An employee shall be able to edit an applied timecard's work description | `PATCH /timecards/:id` on a record with `status='applied'` updates `work_log`; returns `200` |
| FR-015 | The system shall reject edits to approved timecards | `PATCH /timecards/:id` on a record with `status='approved'` returns `400 UNEDITABLE` |
| FR-016 | An employee shall be able to delete an applied timecard | `DELETE /timecards/:id` on a record with `status='applied'` returns `204` |
| FR-017 | The system shall reject deletion of approved timecards | `DELETE /timecards/:id` on `status='approved'` returns `400 UNEDITABLE` |
| FR-018 | An employee shall only be able to view, edit, and delete their own timecards | Requests referencing another user's timecard ID return `404` |

---

### Overtime (FR-019 to FR-026)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-019 | An employee shall be able to log an overtime entry with hours and a work description | `POST /overtime` creates row; payout calculated as `hours × system_config.overtime_rate_per_hour`; status `201` |
| FR-020 | The system shall reject overtime on Sundays and public holidays | Returns `400 INVALID_DATE`; same rules as timecards |
| FR-021 | The overtime payout shall be calculated at the current system rate on creation | Payout stored in DB at time of submission using `system_config.overtime_rate_per_hour` |
| FR-022 | An employee shall be able to edit an applied overtime entry | `PATCH /overtime/:id` updates hours/work_log and recalculates payout at the current rate |
| FR-023 | Payout shall recalculate at the current rate when an overtime entry is edited | Even if the system rate changed since submission, the new payout = `new_hours × current_rate` |
| FR-024 | An employee shall be able to delete an applied overtime entry | `DELETE /overtime/:id` returns `204`; no balance effect |
| FR-025 | The system shall reject edits and deletions of approved overtime entries | Returns `400 UNEDITABLE` |
| FR-026 | An employee shall only view, edit, and delete their own overtime entries | Requests referencing another user's overtime ID return `404` |

---

### Leaves (FR-027 to FR-038)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-027 | An employee shall be able to view their leave balance | `GET /leaves/balance` returns `{ total_credited, used, remaining }` |
| FR-028 | An employee shall be able to apply for a single day's leave | `POST /leaves` with valid date and reason creates row with `status='applied'`; balance decremented |
| FR-029 | An employee shall be able to apply for leave in bulk for a date range | `POST /leaves/bulk` creates rows for all valid dates; balance decremented by total new days |
| FR-030 | The system shall check the full leave balance before inserting any bulk leave rows | If `remaining < new_days_count`, the entire request is rejected; no partial insert |
| FR-031 | Leave balance shall be deducted immediately on application (not on approval) | After `POST /leaves`, `leave_balance.remaining` decrements by the number of new days |
| FR-032 | The system shall reject leave on Sundays and public holidays | Returns `400 INVALID_DATE` |
| FR-033 | Bulk leave creation shall silently skip Sundays, holidays, and duplicate dates | Skipped dates appear in `skipped` count; no error raised |
| FR-034 | An employee shall be able to edit the reason on an applied leave | `PATCH /leaves/:id` on `status='applied'` updates reason; no balance effect |
| FR-035 | An employee shall be able to delete an applied leave | `DELETE /leaves/:id` on `status='applied'` returns `204`; balance restored by 1 |
| FR-036 | The system shall restore leave balance when an applied leave is deleted | `leave_balance.remaining` increments by 1 after delete |
| FR-037 | The system shall reject edits and deletions of approved leaves | Returns `400 UNEDITABLE` |
| FR-038 | An employee shall only view, edit, and delete their own leave records | Requests referencing another user's leave ID return `404` |

---

### Approvals (FR-039 to FR-048)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-039 | A manager shall see a pending timecard queue containing only their direct reports' records | `GET /approvals/timecards` as Manager returns only timecards from employees whose `manager_id = manager.id` |
| FR-040 | A manager shall see a pending leave queue containing only their direct reports' records | Same scope rule as FR-039, applied to leaves |
| FR-041 | The owner shall see a pending timecard queue containing all employees' records | `GET /approvals/timecards` as Owner returns all `status='applied'` timecards |
| FR-042 | The owner shall see a pending leave queue containing all employees' records | Same as FR-041 for leaves |
| FR-043 | A manager shall be able to approve or reject an applied timecard | `POST /approvals/timecards/:id` with `{ action: "approve" | "reject" }` updates status; returns `200` |
| FR-044 | A manager shall be able to approve or reject an applied leave | Same as FR-043 for leaves |
| FR-045 | Approval shall be atomic — only one approver can approve the same record | Second simultaneous approve returns `409 CONFLICT` via `UPDATE WHERE status='applied' RETURNING id` |
| FR-046 | Rejecting a leave shall restore the employee's leave balance | `reject_leave` stored proc atomically updates `status='rejected'` AND increments `leave_balance.remaining` |
| FR-047 | Approving a leave shall NOT change the leave balance | Balance was already deducted on application |
| FR-048 | Once approved, a timecard or leave cannot be edited or deleted by the employee | `PATCH` and `DELETE` on approved records return `400 UNEDITABLE` |

---

### Users (FR-049 to FR-057)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-049 | The owner shall be able to view a list of all users (excluding Aadhaar) | `GET /users` returns all user rows without the `aadhaar` field |
| FR-050 | The owner shall be able to view a single user's full profile including Aadhaar | `GET /users/:id` as Owner returns all fields including `aadhaar` |
| FR-051 | The owner shall be able to create a new user | `POST /users` with valid body creates auth user + `users` row + `leave_balance` row; returns `201` with new user (without Aadhaar) |
| FR-052 | Employee ID shall be auto-generated in sequence starting from SE_5001 | First created employee gets `SE_5001`; subsequent employees get `SE_5002`, `SE_5003`, etc. |
| FR-053 | New users shall receive the default password `12345678` | Supabase Auth user created with this password; `is_default_password = true` |
| FR-054 | A `leave_balance` row shall be created for every new user | `remaining = annual_leave_days` from `system_config` at time of creation |
| FR-055 | The owner shall be able to edit user details | `PATCH /users/:id` updates allowed fields; Employee ID and Aadhaar are not updatable |
| FR-056 | The system shall block role downgrade from Manager to Employee if the manager has active linked employees | Returns `400 LINKED_EMPLOYEES` with message directing owner to reassign employees first |
| FR-057 | The Aadhaar field shall only be visible to the Owner | Manager and Employee roles cannot access `aadhaar` via any API endpoint |

---

### System Config (FR-058 to FR-061)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-058 | Any authenticated user shall be able to read the current system config | `GET /config` returns `{ annual_leave_days, overtime_rate_per_hour, holidays[] }` |
| FR-059 | Only the owner shall be able to save system config | `PUT /config` returns `403` for non-Owner roles |
| FR-060 | Saving system config shall fully replace the holiday list | Old holidays deleted; new holidays inserted in the same DB transaction |
| FR-061 | System config shall have a single row (upsert pattern) | `PUT /config` always updates the one existing `system_config` row |

---

### Calendar (FR-062 to FR-063)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-062 | Any authenticated user shall be able to view their own monthly attendance calendar | `GET /calendar?year=&month=` returns day-map of all timecard, leave, and holiday entries for the authenticated user |
| FR-063 | Managers and owners shall be able to view any user's calendar by passing `user_id` | `GET /calendar?user_id=<id>&year=&month=` returns that user's day-map; Employee role attempting this returns `403` |

---

### Dashboard (FR-064 to FR-066)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-064 | The employee/manager dashboard shall show stats for the current month | Returns: timecards logged this month, leave days used this month, leave balance remaining |
| FR-065 | The owner dashboard shall show system-wide pending approval counts | Returns: total pending timecards count, total pending leaves count |
| FR-066 | Background job shall credit annual leave monthly | pg_cron job runs at midnight IST on the 1st of every month; increments `total_credited` and `remaining` by `annual_leave_days` for all active users |

---

## Non-Functional Requirements

| ID | Category | Requirement | Measurable Target |
|----|----------|-------------|-------------------|
| NFR-01 | Performance | API response time for read endpoints | p95 < 500ms under normal load |
| NFR-02 | Performance | API response time for write endpoints | p95 < 1000ms under normal load |
| NFR-03 | Availability | Backend uptime | ≥ 99% monthly (Railway SLA) |
| NFR-04 | Scalability | Concurrent users supported without degradation | ≥ 50 concurrent users |
| NFR-05 | Security | JWT token lifetime | Access token: 1 hour; Refresh token: 7 days |
| NFR-06 | Security | Token storage | In-memory only; never localStorage, sessionStorage, or cookies |
| NFR-07 | Security | Rate limiting | Login: 10 req/min; Change-password: 5 req/min; All other: 100 req/min per user |
| NFR-08 | Security | Input validation | All API inputs validated by Zod before reaching service layer; 422 on validation failure |
| NFR-09 | Data integrity | Leave balance atomicity | `deduct_leave_balance` and `restore_leave_balance` are PG stored procs; never partial |
| NFR-10 | Data integrity | Approval atomicity | Double-approval impossible via `UPDATE WHERE status='applied' RETURNING id` |
| NFR-11 | Auditability | Structured logging | All API requests logged via pino with `requestId`, `userId`, method, path, status, duration |
| NFR-12 | Auditability | PII redaction in logs | `password`, `old_password`, `new_password`, `aadhaar` fields redacted in all log output |
| NFR-13 | Usability | Mobile responsiveness | All screens usable on screen widths ≥ 375px |
| NFR-14 | Usability | Accessibility | All interactive elements accessible via keyboard; color-coded elements include text labels |
| NFR-15 | Maintainability | TypeScript coverage | No `any` types in application code; all functions and interfaces explicitly typed |
| NFR-16 | Maintainability | Test coverage | Unit tests for all service-layer business logic; integration tests for all API endpoints |
| NFR-17 | Cost | Monthly infrastructure | ≤ ₹3,000/month (currently ~₹2,500) |
| NFR-18 | Deployment | CI pipeline | All PRs must pass lint + unit tests before merge; no direct commits to `main` |

---

## Assumptions

| ID | Assumption |
|----|------------|
| AS-01 | All users access the system on a modern browser (Chrome, Firefox, Edge, Safari — last 2 versions) |
| AS-02 | The company has a stable internet connection; offline support is not required |
| AS-03 | Employee IDs are never reused — the sequence is `NO CYCLE` and no gaps are backfilled |
| AS-04 | There is exactly one Owner in the system at all times; multiple owners are not supported |
| AS-05 | Supabase Pro plan is active before deployment — pg_cron silently fails on the free tier |
| AS-06 | Java Runtime Environment (JRE 8+) is available on the backend host — required by node-flyway |
| AS-07 | Deactivated users' historical records remain visible to the Owner for audit purposes |
| AS-08 | Annual leave quota changes in system config do NOT retroactively adjust existing balances |
| AS-09 | The leave balance credit job credits `annual_leave_days` once per month for all active users; pro-rating for mid-month joiners is not implemented in v1 |
| AS-10 | Flyway runs automatically when the backend server starts; no manual migration execution is needed |
| AS-11 | Bulk timecard and leave operations are limited to a 31-day date range maximum |

---

## Dependencies

| ID | Dependency | Risk |
|----|------------|------|
| DEP-01 | Supabase Pro plan | pg_cron (monthly leave credit) requires Pro; free tier silently skips cron jobs |
| DEP-02 | Java Runtime (JRE 8+) | node-flyway requires Java; not pre-installed on all cloud hosts; set `NIXPACKS_JDK_VERSION=17` on Railway |
| DEP-03 | Supabase `pg_cron` extension | Must be manually enabled in Supabase Dashboard → Extensions before V6 migration runs |
| DEP-04 | Supabase `pg_crypto` extension | Used for `gen_random_uuid()` — enabled by default on Supabase but must be confirmed |
| DEP-05 | Railway deployment platform | Backend hosting; ~$5/month; cold start risk on free tier |
| DEP-06 | Vercel deployment platform | Frontend hosting; free tier; no custom server logic |
| DEP-07 | GitHub repository | Required for CI/CD pipeline and deployment triggers |
