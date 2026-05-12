# 05 — Security Standards
## Soumya Electricals — Workforce Management System

---

## Authentication Design

### Token Strategy

| Property | Value |
|----------|-------|
| Algorithm | RS256 (asymmetric; Supabase manages keys) |
| Access token lifetime | 1 hour |
| Refresh token lifetime | 7 days |
| Token storage | In-memory React Context only |
| Cleared on | Logout, page close (no persistence) |

**Synthetic email mapping:** Supabase Auth requires email-format identifiers. Employee IDs are mapped:
```
SE_5001  →  SE_5001@soumyaelectricals.internal
```
The frontend never knows the synthetic email — it only submits `employee_id`. The backend constructs the email before calling `supabase.auth.signInWithPassword()`.

### Authentication Flow

```
1. Browser POSTs { employee_id, password } to POST /api/v1/auth/login
2. Backend: employeeIdToEmail(employee_id) → synthetic email
3. Backend: supabase.auth.signInWithPassword({ email, password })
4. Supabase returns access_token + refresh_token (RS256 JWT)
5. Backend: queries users table for { role, is_default_password, manager_id, is_active }
6. Backend returns { access_token, refresh_token, user } to browser
7. Browser stores both tokens in React Context (in-memory only)
8. All subsequent requests: Authorization: Bearer <access_token>
```

### Middleware Chain (per-request)

```
Global: requestId → pino-http → apiRateLimit → errorHandler

Per-route (all protected endpoints):
  authenticate → forcePasswordChange → roleGuard (where applicable) → validate → controller
```

**`authenticate` middleware:**
1. Extracts `Authorization: Bearer <token>`
2. Calls `supabase.auth.getUser(token)` — validates signature, expiry
3. Looks up `users` table row (fetches role, is_active, is_default_password)
4. Rejects with `401 UNAUTHORIZED` if token invalid, user not found, or `is_active = false`
5. Attaches `req.user: AuthUser` for downstream use

**`forcePasswordChange` middleware:**
- If `req.user.is_default_password = true` AND path is not `/auth/change-password` → `403 FORCE_PASSWORD_CHANGE`
- Applied to every route after authenticate (except login and change-password)

---

## Three-Layer Permission System

Every protected endpoint must pass all three layers. No exceptions.

```
Layer 1: authenticate middleware
  → Validates JWT; rejects if expired, invalid, or user is inactive
  → Returns 401

Layer 2: roleGuard middleware (applied per-route or per-router)
  → Checks req.user.role against allowed roles
  → Returns 403 FORBIDDEN

Layer 3: Resource ownership check (service layer)
  → Queries include WHERE user_id = req.user.id
  → If no matching record → 404 (deliberately ambiguous; not 403)
  → Prevents IDOR (Insecure Direct Object Reference) attacks
```

**Row Level Security (Layer 4):**
- RLS enabled on all 7 tables as a defence-in-depth 4th layer
- The backend uses the Supabase **service-role client** which bypasses RLS — the application code is the primary guard
- RLS protects against direct DB access if the service-role key is somehow leaked

---

## Role-Permission Matrix

| Action | Employee | Manager | Owner |
|--------|----------|---------|-------|
| Login | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ |
| Create own timecard | ✅ | ✅ | ❌ |
| Edit/delete own applied timecard | ✅ | ✅ | ❌ |
| View own timecards | ✅ | ✅ | ❌ |
| Create own overtime | ✅ | ✅ | ❌ |
| Edit/delete own applied overtime | ✅ | ✅ | ❌ |
| Apply own leave | ✅ | ✅ | ❌ |
| View own leave balance | ✅ | ✅ | ❌ |
| Edit/delete own applied leave | ✅ | ✅ | ❌ |
| View own calendar | ✅ | ✅ | ❌ |
| View team member calendar | ❌ | ✅ | ✅ |
| View own dashboard stats | ✅ | ✅ | ❌ |
| View system-wide pending counts | ❌ | ❌ | ✅ |
| Approve/reject team timecards | ❌ | ✅ (own team) | ✅ (all) |
| Approve/reject team leaves | ❌ | ✅ (own team) | ✅ (all) |
| List all users (no aadhaar) | ❌ | ❌ | ✅ |
| View single user (with aadhaar) | ❌ | ❌ | ✅ |
| Create user | ❌ | ❌ | ✅ |
| Edit user | ❌ | ❌ | ✅ |
| Read system config | ✅ | ✅ | ✅ |
| Save system config | ❌ | ❌ | ✅ |
| List reportable users (for manager selector) | ❌ | ✅ | ✅ |

**Hard constraints:**
- Manager scope is always `WHERE manager_id = req.user.id` — cannot see other managers' teams
- Owner scope has no team filter — sees all records across all employees
- An employee calling `GET /approvals/timecards` → `403 FORBIDDEN` (roleGuard blocks before DB query)

---

## Security Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| XSS token theft | Low (React escapes by default) | Critical | JWT stored in-memory only; never in localStorage/sessionStorage/cookies |
| Brute-force login | Medium | High | Rate limit: 10 req/min/IP; 401 message never reveals which field is wrong |
| IDOR (accessing another user's record) | Medium | High | Service layer: all resource queries include `WHERE user_id = req.user.id`; returns 404 not 403 |
| Approval race condition | Low | Medium | Atomic `UPDATE WHERE status='applied' RETURNING id`; stored proc raises exception if 0 rows affected → 409 |
| Privilege escalation (set own role to owner) | Low | Critical | Owner role blocked in Zod CreateUserSchema/UpdateUserSchema enums; cannot be set via API |
| Aadhaar data exposure | Low | High | Never logged; excluded from list queries; owner-only via explicit field selection; `redact` in pino |
| Service-role key exposure | Very Low | Critical | Never prefixed with `VITE_`; backend env only; not in git; Railway env vars encrypted |
| Leave balance manipulation | Low | Medium | `deduct_leave_balance` and `restore_leave_balance` are atomic PG stored procs; balance cannot go negative |
| pg_cron silent failure | Medium (free tier) | Medium | Supabase Pro required; verify `cron.job` table after production setup |
| Synthetic email collision | Very Low | Low | Employee ID sequence is `NO CYCLE`; IDs never reused; collision impossible unless sequence resets |

---

## Data Protection Rules

### Aadhaar (Indian National ID)

- Stored in `users.aadhaar` column (12 digits as TEXT)
- **Never** returned in `GET /users` list endpoint
- **Never** returned to Manager or Employee role from any endpoint
- Returned only in `GET /users/:id` as Owner
- **Never** logged by pino (included in `redact` paths)
- **Never** included in error response details
- Treated as PII under Indian data protection norms

### Passwords

The following fields are redacted in all pino log output:
```
password, old_password, new_password, aadhaar
```

Passwords are managed entirely by Supabase Auth — never stored in the application database.

### JWT Handling

```
ALLOWED:  Authorization: Bearer <token> header
ALLOWED:  In-memory React Context (cleared on logout / page close)
NEVER:    localStorage.setItem('token', ...)
NEVER:    sessionStorage.setItem('token', ...)
NEVER:    document.cookie = 'token=...'
NEVER:    Logged to pino or Sentry
```

---

## Secrets and Environment Variables

### Backend (`backend/.env`)

| Variable | Purpose | Where to get it |
|----------|---------|-----------------|
| `SUPABASE_URL` | Supabase project API URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role JWT (bypasses RLS) | Supabase Dashboard → Settings → API |
| `SUPABASE_JWT_SECRET` | JWT verification secret | Supabase Dashboard → Settings → API |
| `DATABASE_URL` | PostgreSQL connection string | Supabase Dashboard → Settings → Database |
| `X_CRON_SECRET` | Secret header for cron endpoint | Generate: `openssl rand -hex 32` |
| `PORT` | Express listen port (default 3001) | Set in Railway or leave as default |
| `NODE_ENV` | `development` / `production` / `test` | Set per environment |
| `SENTRY_DSN` | Error tracking (optional) | Sentry project settings |

### Frontend (`frontend/.env`)

| Variable | Purpose | Safe to expose? |
|----------|---------|----------------|
| `VITE_API_BASE_URL` | Backend Railway URL | Yes (public endpoint) |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes (anon-safe) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon JWT | Yes (anon-safe; RLS enforced) |

**Never add to frontend `.env`:**
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; must remain backend-only
- `SUPABASE_JWT_SECRET` — allows forging JWTs
- `DATABASE_URL` — direct DB access

### Secret Management Rules

1. `.env` files are in `.gitignore` — never committed
2. Production secrets set via Railway dashboard env vars (encrypted at rest)
3. `X_CRON_SECRET` rotated if compromised — update in Railway + Supabase pg_cron job definition
4. Owner credentials (SE_5000 password) stored in a password manager; cannot be recovered from DB (only reset via Supabase Admin)

---

## Rate Limiting

Implemented via `express-rate-limit` (version 7).

| Endpoint | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| `POST /auth/login` | 10 req | 60 seconds | Brute-force prevention |
| `POST /auth/change-password` | 5 req | 60 seconds | Abuse prevention |
| All other endpoints | 100 req | 60 seconds | Per authenticated user |

Rate limit state is in-process memory — Railway must run as a single instance (no horizontal scaling). This is acceptable for the 10–50 user scale.

---

## Engineering Security Standards

### Code Rules

1. **No `any` in TypeScript** — use `unknown` and narrow with type guards or Zod `.parse()`
2. **No raw SQL strings in application code** — all DB access via Supabase client's typed query builder or named stored procs
3. **Zod validates all API inputs** — at the `validate` middleware layer before reaching service code; returns 422 with field errors
4. **Business logic only in service layer** — controllers do not make authorization decisions; repositories do not enforce business rules
5. **Error messages never reveal internal details** — stack traces never in responses; Sentry captures them server-side

### Dependency Rules

1. All npm packages pinned with `^` (minor-compatible) — update via `npm audit fix` monthly
2. `npm audit` must show 0 high/critical vulnerabilities before production deployment
3. No packages that require native compilation (C++ addons) — Railway uses Nixpacks which may not have build tools

### Git Workflow

```
Branching:
  main        ← production-ready; protected; no direct commits
  feature/*   ← all development work; short-lived
  hotfix/*    ← emergency fixes; merged to main + feature base

Commit format (Conventional Commits):
  feat(timecards): add bulk creation endpoint
  fix(leaves): correct balance deduction on concurrent apply
  docs(api): update endpoint table in 04_DATA_MODEL_API.md
  refactor(auth): extract employeeIdToEmail to utils

PR rules:
  - All PRs target main
  - Must pass GitHub Actions CI (lint + unit tests) before merge
  - No direct commits to main (branch protection)
  - No --no-verify on commits
  - PR description must reference the milestone and FR numbers being implemented

Branch protection:
  - Require pull request before merging
  - Require status checks: lint, test:unit, test:frontend
  - Do not allow bypassing required status checks
```

---

## Supabase RLS Policy Summary

Defined in `V4__create_rls_policies.sql`.

**Helper functions:**
- `current_user_role()` — reads `role` from the `users` table for the current JWT subject
- `current_user_manager_id()` — reads `manager_id` for the current JWT subject

**Policy design per table:**

| Table | Employee | Manager | Owner |
|-------|----------|---------|-------|
| `users` | SELECT own row only | SELECT own row + managed rows | SELECT/INSERT/UPDATE all |
| `timecards` | SELECT/INSERT/UPDATE/DELETE own rows | SELECT/INSERT own; SELECT team's applied rows | SELECT all |
| `leaves` | SELECT/INSERT/UPDATE/DELETE own rows | SELECT/INSERT own; SELECT team's applied rows | SELECT all |
| `overtime` | SELECT/INSERT/UPDATE/DELETE own rows | SELECT/INSERT own | SELECT all |
| `leave_balance` | SELECT own row | SELECT own row | SELECT all |
| `system_config` | SELECT only | SELECT only | SELECT/UPDATE |
| `holidays` | SELECT only | SELECT only | SELECT/INSERT/DELETE |

**Note:** The backend uses the `service-role` client which bypasses RLS. RLS is the 4th defence-in-depth layer for direct database access scenarios, not the primary permission control. The three-layer application permission system (JWT → roleGuard → ownership check) is the primary guard.
