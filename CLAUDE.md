# Soumya Electricals — Workforce Management System
## Claude Code Context Pack

---

## 1. Problem Statement

- Small Indian electrical business (Soumya Electricals) needs an internal web app to replace manual attendance, leave, and overtime tracking
- Employees log timecards and leaves; managers approve them; the owner manages users and configures system-wide settings
- Built for ~10–50 internal users; no public access; hosted at ~₹2,500/month on Vercel + Railway + Supabase Pro

---

## 2. User Roles

- **Owner** — single superuser; manages users, system config, and sees all pending approvals; seeded via migration only, never via UI
- **Manager** — approves timecards and leaves for their directly linked employees; also an employee themselves
- **Employee** — logs timecards (daily attendance), overtime, and leave; views own calendar and balance

---

## 3. Top Use Cases

- Employee logs a single-day or bulk-range timecard (Sundays + holidays auto-excluded)
- Employee applies single or bulk leave (balance checked before insert; deducted immediately)
- Employee logs overtime entry (payout = hours × current system rate at time of approval)
- Manager approves or rejects timecards from their team's queue
- Manager approves or rejects leave from their team's queue (reject restores balance)
- Owner approves all pending timecards and leaves (full visibility)
- Owner creates a new user (employee ID auto-generated as SE_5001+; default password `12345678`)
- Owner updates system config (annual leave days, OT rate, holiday list)
- Owner views team calendar for any user × month
- Employee / Manager views monthly attendance calendar with color-coded day types

---

## 4. Architecture Summary

- **Style:** Modular Monolith — single Express API, feature modules, no microservices
- **Pattern:** Router → Controller → Service → Repository (strict layer separation)
- **Monorepo:** 3 npm workspaces — `frontend/`, `backend/`, `shared/`
- **Auth:** Supabase Auth (JWT RS256); employee IDs mapped to synthetic emails `SE_5001@soumyaelectricals.internal`
- **DB migrations:** Flyway (node-flyway), runs automatically on `server.ts` boot before `app.listen()`
- **Background jobs:** Supabase pg_cron — monthly leave credit at 18:31 UTC on last day of month (= midnight IST on 1st)
- **Approval race condition:** atomic `UPDATE … WHERE status='applied' RETURNING id` via PostgreSQL stored proc; first write wins, second gets 409

---

## 5. Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + TanStack Query + React Hook Form + Zod + shadcn/ui + Tailwind CSS + React Router v6
- **Backend:** Node.js 20 LTS + Express + TypeScript + Zod + pino + express-rate-limit
- **Database:** Supabase PostgreSQL (Pro plan — required for pg_cron)
- **Auth:** Supabase Auth (JWT Bearer, RS256, 1h access / 7d refresh)
- **Migrations:** Flyway via node-flyway npm package
- **Validation:** Zod on all API inputs — schemas live in `shared/` workspace
- **Logging:** pino with structured JSON + redact config for PII fields
- **Testing:** Jest + supertest (backend), Vitest + React Testing Library (frontend)
- **Hosting:** Vercel (frontend, free) + Railway (backend, ~$5/mo) + Supabase Pro ($25/mo)
- **CI/CD:** GitHub Actions · **Error tracking:** Sentry (free tier)

---

## 6. API Endpoint Groups

- `POST /auth/login` · `POST /auth/change-password`
- `GET|POST|POST /timecards` · `GET|POST|PATCH|DELETE /timecards/bulk|/:id`
- `GET|POST|PATCH|DELETE /overtime` · `PATCH|DELETE /overtime/:id`
- `GET|POST|POST|PATCH|DELETE /leaves` · `GET /leaves/balance` · `POST /leaves/bulk`
- `GET|POST /approvals/timecards` · `GET|POST /approvals/timecards/:id` · same for leaves
- `GET|PATCH /users` · `GET|POST|PATCH /users/:id` · `GET /users/reportable`
- `GET|PUT /config`
- `GET /calendar`
- `GET /dashboard`

---

## 7. Project Structure

```
SoumyaElectricals/          ← git root, npm workspaces
├── docs/               ← project documentation (00–08); read 07_CONTEXT_PACK.md at session start
├── backend/
│   ├── src/
│   │   ├── modules/        ← auth, timecards, overtime, leaves, approvals, users, config, calendar, dashboard
│   │   ├── middleware/     ← authenticate, role-guard, force-password-change, rate-limit, validate, error-handler
│   │   ├── lib/            ← supabase.ts, logger.ts, flyway.ts
│   │   ├── utils/          ← date-utils.ts, employee-id.ts, response.ts
│   │   ├── types/          ← express.d.ts (req.user augment), index.ts (AuthUser, AppError)
│   │   ├── config.ts       ← Zod-validated env vars, fails fast on missing
│   │   ├── app.ts          ← Express app (no listen)
│   │   └── server.ts       ← runMigrations() → app.listen()
│   └── migrations/         ← V1–V9 Flyway SQL (never edit after prod run)
├── frontend/
│   └── src/
│       ├── pages/          ← auth/, employee/, manager/, owner/
│       ├── components/     ← timecards/, leaves/, calendar/, approvals/, users/, ui/
│       ├── common/         ← MonthPaginator, ConfirmDialog, LoadingSpinner, EmptyState, ErrorMessage
│       ├── layouts/        ← AuthLayout, AppLayout, Sidebar
│       ├── hooks/          ← TanStack Query hooks, one file per resource
│       ├── api/            ← raw axios functions, one file per resource
│       ├── store/          ← auth.store.ts (in-memory React Context, never persisted)
│       └── router/         ← index.tsx, ProtectedRoute, RoleRoute
└── shared/
    └── src/
        ├── schemas/        ← Zod schemas (auth, timecard, overtime, leave, user, config)
        └── types/          ← models.ts, api.types.ts, enums.ts
```

---

## 8. Top 5 Engineering Rules — Never Violate

1. **Layer discipline:** Router calls Controller only. Controller calls Service only. Service calls Repository only. Repository calls Supabase only. No skipping layers.
2. **No direct Supabase calls in services or above** — `supabase.from()` is exclusively in `*.repository.ts` files
3. **No raw API calls in components or pages** — all data fetching goes through `hooks/` → `api/` layer only
4. **Shared schemas are the single source of truth** — Zod schemas in `shared/src/schemas/` are imported by both frontend and backend; never duplicate them
5. **Flyway migrations are immutable after production deployment** — never edit a migration file that has already run; add a new Vn migration instead

---

## 9. Security Non-Negotiables

- **JWT never in localStorage or sessionStorage** — in-memory React Context only; cleared on logout
- **Three mandatory permission layers on every protected endpoint:** JWT middleware → role guard → resource ownership check in service
- **Supabase RLS enabled on all tables** — 4th defence-in-depth layer; backend uses service-role client which bypasses RLS, but RLS protects against direct DB access
- **Aadhaar (12-digit Indian national ID) never logged, never in list responses, never sent to Employee/Manager role** — Owner only via explicit field selection
- **`SUPABASE_SERVICE_ROLE_KEY` never exposed to frontend** — backend only
- **Owner role can only be seeded via migration (V8)** — the `CreateUserSchema` enum blocks 'owner' role from the API
- **Rate limits:** 10 req/min on login, 5 req/min on change-password, 100 req/min per user for all other endpoints
- **Force-password-change middleware** blocks all routes except `/auth/change-password` when `is_default_password = true`

---

## 10. Key Risks

- **pg_cron requires Supabase Pro** — free tier will silently skip the monthly leave credit job
- **Flyway needs JDBC-format URL** — `DATABASE_URL` (postgres:// format) must be converted to `jdbc:postgresql://` in `lib/flyway.ts`
- **Approval race condition** — two managers approving the same record simultaneously; mitigated by atomic `UPDATE WHERE status='applied' RETURNING id` in stored proc
- **Synthetic email collisions** — if employee ID sequence resets or employee IDs are reused, Supabase Auth will reject duplicate email; sequence is non-cycling (`NO CYCLE`)
- **Leave balance drift** — if a leave is rejected, balance is restored in the stored proc; if the proc fails mid-transaction, balance can go stale; `restore_leave_balance` must be idempotent

---

## 11. Open Questions Still Unresolved

- *(none — all clarifying questions from Steps 1–7 have been answered)*
- Owner seeding (V8 migration) is a template — real UUID + credentials must be filled before first production deploy
- Sentry DSN: optional; left blank locally; must be set for production error tracking

---

## What Claude Code Must Never Do on This Project

**Architecture**
- Never put business logic in a controller, router, or repository
- Never call `supabase.from()` outside a `*.repository.ts` file
- Never call `axios` or `fetch` directly inside a React component or page — always through a hook
- Never create new shared types in `frontend/src/types/` that duplicate `shared/src/types/` — re-export instead
- Never add a new migration by editing an existing `V*.sql` file — always create `V(n+1)__*.sql`

**Security**
- Never store the JWT access token or refresh token in `localStorage`, `sessionStorage`, or any cookie
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET` to the frontend (no `VITE_` prefix on these)
- Never allow 'owner' role to be set via the users API — the Zod schema enum blocks it; keep it that way
- Never skip the `forcePasswordChange` middleware on any route that is not `/auth/change-password`
- Never log or return `aadhaar` to a non-owner role

**Patterns**
- Never use Redux — TanStack Query owns server state; React Context owns in-memory auth state
- Never use `any` in TypeScript — use `unknown` and narrow properly
- Never write Docker Compose for the application — Supabase CLI handles local Postgres; Railway handles production
- Never add a `docker-compose.yml` for the app itself
- Never use `--no-verify` on git commits or bypass Conventional Commits format

---

## 12. Implementation Progress (as of 2026-05-09)

### Completed
- **M-01** — npm install, all 3 workspaces compile, .env files in place
- **M-02** — Migrations V1–V7 + V9 applied via Supabase SQL editor; owner seeded (SE_5000 / `ChangeMe@2024!`)
- **M-03** — Auth backend working: login returns JWT, force-password-change middleware active
- **M-04–M-08** — All backend routes wired: timecards, leaves, overtime, approvals, users, config, calendar, dashboard
- **M-09** — Frontend auth: login, role redirect, JWT in-memory, CORS fixed
- **M-10** — All employee screens built: MyTimecard, MyLeave, MyCalendar, Dashboard + all sub-components

### Environment
- Supabase project: `mafdakbwchpmqqihpnbb.supabase.co` (remote, not local)
- Backend port: **8585** (set in backend/.env)
- Frontend: `http://localhost:5173`
- Owner login: `SE_5000` / `ChangeMe@2024!`

### Known Deviations from Original Plan
- Flyway cannot connect to remote Supabase via JDBC — migrations run manually via SQL editor
- V8 migration is a no-op; owner was seeded via `backend/scripts/seed-owner.ts` one-time script
- SENTRY_DSN (backend + frontend) uses `z.preprocess` to treat empty string as `undefined`
- `cors` package added to backend; `dotenv` added as explicit dependency

### Test Data
- Script: `backend/scripts/seed-test-data.ts`
- Creates SE_5001–SE_5015 (3 managers + 12 employees), password `Soumya@2024`
- Timecards for May 2026; 2 employee leaves pending with SE_5001; 1 manager timecard + 1 manager leave pending with owner
- Run from `backend/` directory (not monorepo root)

### Next: M-11 — Manager Approval Screens
- ApprovalRow, ApprovalTable components
- TimecardApproval page, LeaveApproval page
- Hook wiring: useTimecardApprovals, useLeaveApprovals, useProcessTimecardApproval, useProcessLeaveApproval
