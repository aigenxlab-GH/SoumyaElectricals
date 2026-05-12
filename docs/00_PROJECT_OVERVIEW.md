# 00 — Project Overview
## Soumya Electricals — Workforce Management System

---

## What This Application Does

Soumya Electricals is a small Indian electrical contracting business that previously tracked employee attendance, leave, and overtime manually using paper or spreadsheets. This application replaces that process with a structured internal web system accessible only to authorised staff.

The system gives every employee a personal portal to log their daily attendance (timecards), apply for leave, and record overtime hours. Managers receive a role-scoped approval queue to review and approve or reject submissions from their directly assigned team members. The owner — a single superuser — has full visibility across the organisation: they can view all pending approvals, manage user accounts, configure system-wide settings (annual leave quota, overtime pay rate, holiday calendar), and view a team-wide attendance calendar for any employee and month.

The application is designed for approximately 10–50 internal users and is not accessible to the public. It is hosted on a low-cost cloud stack (Vercel + Railway + Supabase Pro) at approximately ₹2,500 per month.

---

## Document Map

| File | Contents | When to Read |
|------|----------|--------------|
| **00_PROJECT_OVERVIEW.md** | What the app does, document map, reading order | First — always |
| **01_USE_CASES.md** | Roles, use cases, screen inventory, navigation, business rules, edge cases | Requirements review, feature planning |
| **02_REQUIREMENTS.md** | Numbered functional requirements (FR-001–FR-066) with acceptance criteria; non-functional requirements with measurable targets | Before implementing any feature |
| **03_ARCHITECTURE_STACK.md** | Architecture style, component breakdown, data flow, tech stack table, trade-offs | Before any structural change |
| **04_DATA_MODEL_API.md** | 7 database tables, full schema, relationships, all 34 API endpoints, error format | Backend implementation, API integration |
| **05_SECURITY_STANDARDS.md** | Auth design, role-permission matrix, security risks, data protection, secrets list, rate limits, engineering standards, git workflow | Before any auth, permission, or data-handling change |
| **06_PROJECT_STRUCTURE.md** | Backend and frontend folder trees, layer rules, `.env` variable list | Session orientation, adding new files |
| **07_CONTEXT_PACK.md** | Compact session-start context; "What Claude Code must never do" | Paste at start of every new Claude Code session |
| **08_IMPLEMENTATION_PLAN.md** | 15 milestones with tasks, dependencies, validation criteria, risk notes | Sprint planning, APPLY sessions |

---

## Recommended Reading Order

**For a new developer joining the project:**
1. `00_PROJECT_OVERVIEW.md` — this file
2. `01_USE_CASES.md` — understand what users do and why
3. `06_PROJECT_STRUCTURE.md` — orient yourself in the codebase
4. `03_ARCHITECTURE_STACK.md` — understand technical decisions
5. `04_DATA_MODEL_API.md` — understand data and endpoints
6. `05_SECURITY_STANDARDS.md` — understand security rules before touching any code

**For an implementation session with Claude Code:**
1. Paste `07_CONTEXT_PACK.md` at the start of the session
2. Reference `08_IMPLEMENTATION_PLAN.md` to identify the current milestone
3. Reference `04_DATA_MODEL_API.md` for endpoint and schema details during implementation

**For a product or QA review:**
1. `01_USE_CASES.md` for user flows and business rules
2. `02_REQUIREMENTS.md` for acceptance criteria

---

## Key Numbers

| Item | Value |
|------|-------|
| User roles | 3 (Owner, Manager, Employee) |
| Screens | 16 (S-01 to S-16) |
| Functional requirements | 66 (FR-001 to FR-066) |
| API endpoints | 34 |
| Database tables | 7 |
| Flyway migrations | 9 (V1–V9) |
| Implementation milestones | 15 (M-01 to M-15) |
| Estimated APPLY sessions | 52–65 |
| Monthly infrastructure cost | ~₹2,500 (~$30 USD) |
