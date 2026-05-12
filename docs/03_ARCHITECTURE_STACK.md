# 03 — Architecture & Tech Stack
## Soumya Electricals — Workforce Management System

---

## Architecture Style

**Modular Monolith**

A single Node.js/Express API server with code organised into feature modules (auth, timecards, overtime, leaves, approvals, users, config, calendar, dashboard). All modules run in the same process, share the same Supabase client, and are deployed as a single unit.

**Why not microservices?**
- Team size: 1–2 developers
- User base: 10–50 internal users
- No independent scaling requirements between features
- No cross-service network calls needed
- Microservices would add operational overhead with no benefit at this scale

**Why not a serverless/edge function approach?**
- Flyway requires a persistent server process to run migrations on boot
- Rate limiting state (express-rate-limit) requires a consistent runtime; serverless cold starts break per-IP state
- pg_cron handles background jobs at the DB layer, removing the need for an external scheduler

---

## Component Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                            │
│  ┌──────────┐  ┌──────────────┐  ┌─────────┐  ┌────────────┐  │
│  │  Pages   │  │  Components  │  │  Hooks  │  │  api/*.ts  │  │
│  │(route    │→ │(UI only,     │  │(TanStack│→ │(axios,     │  │
│  │ shells)  │  │ no API calls)│  │ Query)  │  │ typed)     │  │
│  └──────────┘  └──────────────┘  └─────────┘  └────────────┘  │
│                                                    │             │
│  ┌──────────────────────────────────────────┐      │             │
│  │  auth.store.ts (React Context, in-memory)│      │             │
│  └──────────────────────────────────────────┘      │             │
└────────────────────────────────────────────────────┼─────────────┘
                                                     │ HTTPS
                                          Bearer JWT │
┌────────────────────────────────────────────────────▼─────────────┐
│  Express API (Node.js 20, Railway)                                │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Global Middleware Chain                                     │ │
│  │  requestId → pino-http → apiRateLimit → errorHandler        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Per-route middleware:                                            │
│  authenticate → forcePasswordChange → roleGuard → validate       │
│                                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  Router  │→ │  Controller  │→ │   Service   │→ │  Repo.   │ │
│  │(routes + │  │(HTTP only:   │  │(business    │  │(Supabase │ │
│  │ midware) │  │ parse, send) │  │ logic only) │  │ calls)   │ │
│  └──────────┘  └──────────────┘  └─────────────┘  └──────────┘ │
│                                                          │        │
└──────────────────────────────────────────────────────────┼────────┘
                                                           │ supabase-js
                                                           │ (service-role)
┌──────────────────────────────────────────────────────────▼────────┐
│  Supabase (PostgreSQL + Auth)                                      │
│                                                                    │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Auth service  │  │  PostgreSQL  │  │  pg_cron           │    │
│  │  (JWT, users)  │  │  (7 tables,  │  │  (monthly leave    │    │
│  │                │  │   RLS, procs)│  │   credit job)      │    │
│  └────────────────┘  └──────────────┘  └────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘

Flyway (node-flyway)
  └─ Runs on backend server.ts boot
  └─ Applies V1–V9 migrations to Supabase PostgreSQL
  └─ Exits before app.listen() if any migration fails
```

---

## Key Data Flows

### Login Flow
```
1. Browser POSTs { employee_id, password } to POST /api/v1/auth/login
2. Backend constructs synthetic email: SE_5001@soumyaelectricals.internal
3. Backend calls supabase.auth.signInWithPassword({ email, password })
4. Supabase returns JWT access_token + refresh_token
5. Backend queries users table for employee details (role, is_default_password, manager_id)
6. Backend returns { access_token, refresh_token, user } to browser
7. Browser stores tokens in React Context (in-memory) — NEVER in localStorage
8. All subsequent requests include Authorization: Bearer <access_token>
```

### Timecard Creation Flow
```
1. Browser POSTs { date, work_log } to POST /api/v1/timecards
2. authenticate middleware: validates JWT → attaches req.user
3. forcePasswordChange middleware: rejects if is_default_password = true
4. validate middleware: Zod parses body → rejects with 422 if invalid
5. timecardController.createSingle: calls timecardService.createSingle(req.user, req.body)
6. timecardService: gets holiday list from configRepository
7. timecardService: checks Sunday → throws AppError 400 if Sunday
8. timecardService: checks holiday → throws AppError 400 if holiday
9. timecardService: checks existing date → throws AppError 409 if duplicate
10. timecardService: calls timecardRepository.insertOne(user.id, date, work_log)
11. timecardRepository: supabase.from('timecards').insert(...).select().single()
12. Response: 201 { success: true, data: <timecard> }
```

### Leave Approval / Reject Flow (race-condition safe)
```
1. Browser POSTs { action: "reject" } to POST /api/v1/approvals/leaves/:id
2. authenticate → forcePasswordChange → roleGuard('manager', 'owner')
3. approvalService.processLeave(id, 'reject')
4. approvalRepository.rejectLeave(id) calls supabase.rpc('reject_leave', { p_leave_id: id })
5. PG stored proc: UPDATE leaves SET status='rejected' WHERE id=p_leave_id AND status='applied' RETURNING *
6. If 0 rows updated → raises exception → AppError 409
7. If 1 row updated → UPDATE leave_balance SET remaining=remaining+1 WHERE user_id=leave.user_id
8. Both steps in a single PG transaction → atomic
9. Response: 200 { success: true, data: <updated_leave> }
```

### Monthly Leave Credit (background)
```
1. pg_cron fires at 18:31 UTC on days 28–31 of each month
2. SQL checks: is today the last day of the month?
3. If yes: UPDATE leave_balance SET total_credited+=annual_leave_days, remaining+=annual_leave_days
   WHERE user_id IN (SELECT id FROM users WHERE is_active=true)
4. No server process involved — runs entirely in the database
```

---

## Text-Based Architecture Diagram

```
INTERNET
    │
    ├─── HTTPS ──► Vercel CDN
    │                   └── React SPA (static build)
    │                         └── calls API via axios
    │
    └─── HTTPS ──► Railway (Node.js container)
                       └── Express server (:3001)
                             ├── On boot: Flyway migrations → PostgreSQL
                             └── On request: JWT auth → module router → Supabase client

                       Supabase (managed PostgreSQL + Auth)
                             ├── JWT issuance / verification (RS256)
                             ├── 7 application tables with RLS
                             ├── 5 stored procedures (approve_leave, reject_leave,
                             │   deduct_balance, restore_balance, next_employee_id)
                             └── pg_cron: monthly leave credit job

DEVELOPER MACHINE (local)
    ├── npx supabase start → local PostgreSQL (:54322) + Studio (:54323)
    ├── npm run dev:backend → ts-node-dev on :3001
    └── npm run dev:frontend → Vite on :5173
```

---

## Tech Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Frontend framework** | React | 18 | Stable, large ecosystem, team familiarity |
| **Frontend build tool** | Vite | 5 | Fast HMR; native ESM; no CRA overhead |
| **Frontend language** | TypeScript | 5.4 | Type safety; shared types with backend |
| **Server state management** | TanStack Query | 5 | Handles caching, background refetch, optimistic updates without Redux complexity |
| **Form management** | React Hook Form | 7 | Uncontrolled inputs; minimal re-renders; native Zod integration via `@hookform/resolvers` |
| **Validation** | Zod | 3 | Runtime validation with TypeScript type inference; shared between frontend + backend |
| **UI components** | shadcn/ui | latest | Copied-in components (not a runtime dependency); fully customisable; Tailwind-based |
| **CSS** | Tailwind CSS | 3 | Utility-first; no CSS files to maintain; consistent design system |
| **Routing** | React Router v6 | 6 | Industry standard; nested routes; declarative guards |
| **HTTP client** | Axios | 1.7 | Interceptors for auth header injection and 401 handling |
| **Backend framework** | Express.js | 4 | Minimal, well-understood, sufficient for this scale |
| **Backend language** | Node.js + TypeScript | 20 LTS + 5.4 | LTS stability; TypeScript for type safety |
| **Database** | Supabase PostgreSQL | Pro plan | Managed Postgres + Auth + RLS + pg_cron in one service |
| **Authentication** | Supabase Auth | latest | JWT RS256; refresh token rotation; admin SDK for user management |
| **DB migrations** | Flyway (node-flyway) | 1.3 | Version-controlled SQL migrations; auto-runs on server boot; immutable history |
| **Logging** | pino | 9 | Structured JSON; low overhead; built-in `redact` for PII |
| **Rate limiting** | express-rate-limit | 7 | Per-IP and per-user rate limits; simple configuration |
| **Testing (backend)** | Jest + supertest | 29 + 7 | Industry standard; supertest for HTTP integration tests |
| **Testing (frontend)** | Vitest + RTL | 1 + 16 | Vite-native test runner; React Testing Library for component tests |
| **CI/CD** | GitHub Actions | latest | Free for public repos; tight GitHub integration |
| **Frontend hosting** | Vercel | free tier | Zero-config Vite deployment; CDN included |
| **Backend hosting** | Railway | ~$5/month | Simple container deployment; automatic builds from GitHub |
| **Error tracking** | Sentry | free tier | Real-time error reporting; session replay optional |

---

## Trade-offs and Risks

| Decision | Trade-off | Risk |
|----------|-----------|------|
| **Modular Monolith over Microservices** | Simpler ops, no service mesh needed | If load grows dramatically, individual features cannot be scaled independently — acceptable for 10–50 users |
| **Supabase Auth (not custom JWT)** | Faster auth implementation; managed refresh token rotation | Vendor lock-in to Supabase; migration cost if platform changes |
| **Flyway on server boot** | No manual migration step; zero-downtime upgrade path | Slow boot if many migrations pending; migration failure causes server to refuse to start (intentional fail-fast) |
| **In-memory JWT storage** | Protects against XSS token theft | Token lost on page refresh; user must re-login after browser restart (acceptable UX trade-off for security) |
| **pg_cron for background jobs** | No external scheduler needed; runs in DB | Requires Supabase Pro plan; silent failure on free tier; no retry logic |
| **Single `system_config` row** | Simple upsert pattern; no versioning | If multi-tenancy is ever added, this design cannot support per-tenant config without a schema change |
| **RLS as 4th layer (not primary)** | Defence in depth; catches direct DB access | Backend uses service-role client which bypasses RLS — the 3-layer permission system in application code is the primary guard |
| **`SE_` employee ID format** | Human-readable; consistent | Sequence is non-cycling; if IDs are exhausted past SE_9999 the format breaks — acceptable given 50-user limit |
