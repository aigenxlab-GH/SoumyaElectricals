# 06 — Project Structure
## Soumya Electricals — Workforce Management System

---

## Monorepo Layout

```
SoumyaElectricals/              ← git root; npm workspaces root
├── package.json                ← workspace definitions; root dev scripts
├── .gitignore
├── .env.example                ← all variable names; no real values; committed to git
├── README.md                   ← setup instructions; dev workflow
├── CLAUDE.md                   ← auto-loaded Claude Code context pack (Step 8)
│
├── docs/                       ← all project documentation (00–08)
│
├── backend/                    ← npm workspace: @soumya/backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── .env                    ← NOT committed; copy from .env.example
│   ├── migrations/             ← Flyway SQL files (immutable after prod run)
│   │   ├── V1__create_enums.sql
│   │   ├── V2__create_tables.sql
│   │   ├── V3__create_indexes.sql
│   │   ├── V4__create_rls_policies.sql
│   │   ├── V5__create_functions.sql
│   │   ├── V6__create_pg_cron.sql
│   │   ├── V7__seed_system_config.sql
│   │   ├── V8__seed_owner.sql      ← template only; fill UUID before prod
│   │   └── V9__create_employee_id_sequence.sql
│   ├── src/
│   │   ├── server.ts               ← entry point; runMigrations() → app.listen()
│   │   ├── app.ts                  ← Express app factory (no listen); all routers mounted
│   │   ├── config.ts               ← Zod-validated env vars; fails fast on missing
│   │   ├── lib/
│   │   │   ├── supabase.ts         ← Supabase client (service-role)
│   │   │   ├── logger.ts           ← pino logger with PII redact config
│   │   │   └── flyway.ts           ← postgres:// → jdbc: URL conversion; runMigrations()
│   │   ├── middleware/
│   │   │   ├── authenticate.ts     ← validates JWT; attaches req.user
│   │   │   ├── force-password-change.ts  ← 403 gate if is_default_password = true
│   │   │   ├── role-guard.ts       ← roleGuard('owner') factory; 403 on mismatch
│   │   │   ├── validate.ts         ← Zod schema validation factory; 422 on fail
│   │   │   ├── rate-limit.ts       ← loginRateLimit / changePasswordRateLimit / apiRateLimit
│   │   │   ├── request-id.ts       ← attaches unique requestId to req and res headers
│   │   │   └── error-handler.ts    ← global error handler; AppError → JSON; 500 fallback
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.router.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.repository.ts
│   │   │   │   └── auth.schema.ts      ← LoginSchema, ChangePasswordSchema
│   │   │   ├── timecards/
│   │   │   │   ├── timecard.router.ts
│   │   │   │   ├── timecard.controller.ts
│   │   │   │   ├── timecard.service.ts
│   │   │   │   ├── timecard.repository.ts
│   │   │   │   └── timecard.schema.ts  ← CreateTimecardSchema, BulkTimecardSchema, UpdateTimecardSchema
│   │   │   ├── overtime/
│   │   │   │   ├── overtime.router.ts
│   │   │   │   ├── overtime.controller.ts
│   │   │   │   ├── overtime.service.ts
│   │   │   │   ├── overtime.repository.ts
│   │   │   │   └── overtime.schema.ts
│   │   │   ├── leaves/
│   │   │   │   ├── leave.router.ts
│   │   │   │   ├── leave.controller.ts
│   │   │   │   ├── leave.service.ts
│   │   │   │   ├── leave.repository.ts
│   │   │   │   └── leave.schema.ts
│   │   │   ├── approvals/
│   │   │   │   ├── approval.router.ts
│   │   │   │   ├── approval.controller.ts
│   │   │   │   ├── approval.service.ts
│   │   │   │   ├── approval.repository.ts
│   │   │   │   └── approval.schema.ts  ← ApprovalActionSchema
│   │   │   ├── users/
│   │   │   │   ├── user.router.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── user.repository.ts
│   │   │   │   └── user.schema.ts
│   │   │   ├── config/
│   │   │   │   ├── config.router.ts
│   │   │   │   ├── config.controller.ts
│   │   │   │   ├── config.service.ts
│   │   │   │   ├── config.repository.ts
│   │   │   │   └── config.schema.ts    ← SystemConfigSchema
│   │   │   ├── calendar/
│   │   │   │   ├── calendar.router.ts
│   │   │   │   ├── calendar.controller.ts
│   │   │   │   ├── calendar.service.ts
│   │   │   │   ├── calendar.repository.ts
│   │   │   │   └── calendar.schema.ts
│   │   │   └── dashboard/
│   │   │       ├── dashboard.router.ts
│   │   │       ├── dashboard.controller.ts
│   │   │       ├── dashboard.service.ts
│   │   │       └── dashboard.repository.ts
│   │   ├── types/
│   │   │   ├── express.d.ts        ← augments Express.Request: req.user, req.requestId
│   │   │   └── index.ts            ← AuthUser, AppError class
│   │   └── utils/
│   │       ├── date-utils.ts       ← isSunday(), isHoliday(), isValidWorkDate(), expandDateRange()
│   │       ├── employee-id.ts      ← formatEmployeeId(seq), employeeIdToEmail(id)
│   │       └── response.ts         ← ok(data), fail(code, message, details?)
│   └── tests/
│       ├── unit/
│       │   └── utils/
│       │       ├── date-utils.test.ts
│       │       └── employee-id.test.ts
│       └── integration/
│           ├── setup.ts            ← supertest app setup; test auth helper
│           └── auth.test.ts        ← (+ timecards, leaves to be completed in M-14)
│
├── frontend/                   ← npm workspace: @soumya/frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── .env                    ← NOT committed; copy from .env.example
│   ├── index.html
│   └── src/
│       ├── main.tsx             ← React root; QueryClientProvider; AuthProvider; RouterProvider
│       ├── App.tsx              ← thin wrapper; imports router
│       ├── config.ts            ← VITE_ env var validation; API_BASE_URL
│       ├── api/
│       │   ├── client.ts            ← Axios instance; token injection interceptor; 401 redirect
│       │   ├── auth.api.ts
│       │   ├── timecards.api.ts
│       │   ├── overtime.api.ts
│       │   ├── leaves.api.ts
│       │   ├── approvals.api.ts
│       │   ├── users.api.ts
│       │   ├── config.api.ts
│       │   └── calendar.api.ts
│       ├── hooks/               ← TanStack Query hooks; one file per resource
│       │   ├── useAuth.ts
│       │   ├── useTimecards.ts
│       │   ├── useOvertime.ts
│       │   ├── useLeaves.ts
│       │   ├── useApprovals.ts
│       │   ├── useUsers.ts
│       │   ├── useConfig.ts
│       │   ├── useCalendar.ts
│       │   └── useDashboard.ts
│       ├── store/
│       │   └── auth.store.ts        ← AuthContext; useAuthState(); tokens in-memory only
│       ├── router/
│       │   ├── index.tsx            ← createBrowserRouter(); full route tree
│       │   ├── ProtectedRoute.tsx   ← redirects to /login if no user; to /change-password if default pw
│       │   └── RoleRoute.tsx        ← redirects to /unauthorized if role not in allowedRoles
│       ├── layouts/
│       │   ├── AuthLayout.tsx       ← centered card layout for login/change-password
│       │   ├── AppLayout.tsx        ← main shell: Sidebar + Outlet
│       │   └── Sidebar.tsx          ← nav per role; sign-out button
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── Login.tsx            ← S-01 (fully implemented)
│       │   │   └── ChangePassword.tsx   ← S-02 (fully implemented)
│       │   ├── employee/
│       │   │   ├── Dashboard.tsx        ← S-03 (stub)
│       │   │   ├── MyTimecard.tsx       ← S-04 (stub)
│       │   │   ├── MyLeave.tsx          ← S-05 (stub)
│       │   │   └── MyCalendar.tsx       ← S-06 (stub)
│       │   ├── manager/
│       │   │   ├── TimecardApproval.tsx ← S-07 (stub)
│       │   │   └── LeaveApproval.tsx    ← S-08 (stub)
│       │   └── owner/
│       │       ├── OwnerDashboard.tsx          ← S-09 (stub)
│       │       ├── ManagerTimecardApproval.tsx ← S-10 (stub)
│       │       ├── ManagerLeaveApproval.tsx    ← S-11 (stub)
│       │       ├── TeamCalendar.tsx            ← S-12 (stub)
│       │       ├── UserManagement.tsx          ← S-13 (stub)
│       │       ├── CreateUser.tsx              ← S-14 (stub)
│       │       ├── EditUser.tsx                ← S-15 (stub)
│       │       └── SystemConfig.tsx            ← S-16 (stub)
│       ├── components/          ← Feature-specific UI components (to be created in M-10 through M-13)
│       │   ├── timecards/       ← TimecardList, TimecardForm, BulkPreview
│       │   ├── leaves/          ← LeaveList, LeaveForm, LeaveBalanceWidget
│       │   ├── calendar/        ← AttendanceCalendar, CalendarLegend
│       │   ├── approvals/       ← ApprovalTable, ApprovalRow
│       │   └── users/           ← UserTable, UserForm, UserSelector
│       ├── common/              ← Shared utility components (fully implemented)
│       │   ├── MonthPaginator.tsx
│       │   ├── ConfirmDialog.tsx
│       │   ├── LoadingSpinner.tsx
│       │   ├── EmptyState.tsx
│       │   └── ErrorMessage.tsx
│       ├── types/               ← Re-exports from @soumya/shared (no duplication)
│       │   ├── models.ts
│       │   ├── api.types.ts
│       │   └── enums.ts
│       └── utils/
│           ├── cn.ts            ← clsx + tailwind-merge helper
│           ├── constants.ts     ← SIDEBAR_NAV config per role; MAX_DATE_RANGE_DAYS
│           └── date-utils.ts    ← Same logic as backend date-utils (expandDateRange, etc.)
│   └── tests/
│       ├── setup.ts
│       └── utils/
│           └── date-utils.test.ts
│
└── shared/                     ← npm workspace: @soumya/shared
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts             ← barrel export: re-exports schemas + types
        ├── schemas/             ← Zod schemas; imported by BOTH backend and frontend
        │   ├── auth.schema.ts   ← LoginSchema, ChangePasswordSchema
        │   ├── timecard.schema.ts
        │   ├── overtime.schema.ts
        │   ├── leave.schema.ts
        │   ├── user.schema.ts   ← CreateUserSchema (owner role blocked); UpdateUserSchema
        │   └── config.schema.ts ← SystemConfigSchema
        └── types/               ← TypeScript interfaces; no Zod; pure types
            ├── models.ts        ← User, Timecard, Overtime, Leave, LeaveBalance, SystemConfig, Holiday
            ├── api.types.ts     ← ApiResponse<T>, ApiError, LoginResponse, etc.
            └── enums.ts         ← Role, Status, Sex type aliases
```

---

## Layer Rules

The backend strictly enforces a four-layer pattern. Violations break testability and create security holes.

```
Router     → validates HTTP-level concerns (path params, query strings, middleware chain)
Controller → parses req, calls one service method, sends res; no logic
Service    → business logic only; calls repository methods; never calls Supabase directly
Repository → Supabase client calls only; no business logic
```

**Correct example:**
```typescript
// timecard.controller.ts — HTTP only
async createSingle(req, res, next) {
  try {
    const timecard = await timecardService.createSingle(req.user, req.body)
    res.status(201).json(ok(timecard))
  } catch (err) { next(err) }
}

// timecard.service.ts — business logic only
async createSingle(user: AuthUser, dto: CreateTimecardDto) {
  const holidays = await configRepository.getHolidayDates()
  if (isSunday(dto.date)) throw new AppError('INVALID_DATE', '...', 400)
  if (isHoliday(dto.date, holidays)) throw new AppError('INVALID_DATE', '...', 400)
  return timecardRepository.insertOne(user.id, dto.date, dto.work_log)
}

// timecard.repository.ts — Supabase only
async insertOne(userId: string, date: string, workLog: string): Promise<Timecard> {
  const { data, error } = await supabase.from('timecards').insert({...}).select().single()
  if (error) throw new AppError('DUPLICATE', '...', 409)
  return data
}
```

**Wrong (never do this):**
```typescript
// ❌ Business logic in controller
async createSingle(req, res, next) {
  if (new Date(req.body.date).getDay() === 0) { // WRONG
    return res.status(400).json(fail('INVALID_DATE', '...'))
  }
  ...
}

// ❌ Supabase call in service
async createSingle(user, dto) {
  const { data } = await supabase.from('timecards').insert({...}) // WRONG — use repository
}
```

---

## Frontend Layer Rules

```
Page         → assembles components; connects hooks; manages page-level state (dialogs, selected month)
Component    → pure UI; receives props; fires callbacks; never fetches data directly
Hook         → TanStack Query useQuery / useMutation; calls api/* functions; returns loading/error/data
api/*        → raw axios functions; returns typed response data; no React state
store/auth   → in-memory React Context for auth user + tokens; not TanStack Query
```

**Correct example:**
```typescript
// hooks/useTimecards.ts
export function useTimecards(year: number, month: number) {
  return useQuery({ queryKey: ['timecards', year, month], queryFn: () => timecardsApi.list(year, month) })
}

// api/timecards.api.ts
export const timecardsApi = {
  list: (year: number, month: number) =>
    apiClient.get<ApiResponse<Timecard[]>>(`/timecards?year=${year}&month=${month}`).then(r => r.data.data)
}

// pages/employee/MyTimecard.tsx
const { data: timecards } = useTimecards(year, month)
return <TimecardList items={timecards} onDelete={handleDelete} />
```

**Wrong (never do this):**
```typescript
// ❌ Axios call in component
function TimecardList() {
  useEffect(() => { axios.get('/timecards').then(...) }, []) // WRONG — use hook
}
```

---

## `.env` Variable Reference

### `backend/.env`

```
# Supabase
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=...

# Database (for Flyway)
DATABASE_URL=postgresql://postgres:<password>@db.<project-id>.supabase.co:5432/postgres

# App
PORT=3001
NODE_ENV=development
X_CRON_SECRET=<32-char random hex>

# Error tracking (optional)
SENTRY_DSN=https://...@sentry.io/...
```

### `frontend/.env`

```
# API
VITE_API_BASE_URL=http://localhost:3001/api/v1

# Supabase (anon key only — safe to expose)
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Local Supabase values (after `npx supabase start`)

```
API URL:          http://localhost:54321
anon key:         <shown in CLI output>
service_role key: <shown in CLI output>
DB URL:           postgresql://postgres:postgres@localhost:54322/postgres
Studio URL:       http://localhost:54323
```

---

## File Naming Conventions

| Layer | Pattern | Example |
|-------|---------|---------|
| Backend module | `<feature>.<layer>.ts` | `timecard.service.ts` |
| Frontend hook | `use<Resource>.ts` | `useTimecards.ts` |
| Frontend api | `<resource>.api.ts` | `timecards.api.ts` |
| Frontend component | `PascalCase.tsx` | `TimecardList.tsx` |
| Frontend page | `PascalCase.tsx` | `MyTimecard.tsx` |
| Flyway migration | `V<n>__<description>.sql` | `V2__create_tables.sql` |
| Test | `<subject>.test.ts(x)` | `date-utils.test.ts` |

---

## Adding a New Feature Module (Backend)

1. Create `backend/src/modules/<feature>/` with 5 files: `*.router.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.schema.ts`
2. Mount the router in `backend/src/app.ts`: `app.use('/api/v1/<feature>', featureRouter)`
3. If new DB tables are needed: create `V<n+1>__<description>.sql` in `migrations/` — never edit existing migrations
4. If new shared types are needed: add to `shared/src/types/models.ts` and re-export from `shared/src/index.ts`
5. If new Zod schemas are needed for both frontend + backend: add to `shared/src/schemas/`
