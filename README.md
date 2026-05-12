# Soumya Electricals — Workforce Management System

Internal workforce management system for tracking attendance, leave, and overtime.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + TanStack Query + shadcn/ui + Tailwind CSS
- **Backend:** Node.js 20 + Express + TypeScript + Zod + pino
- **Database:** Supabase (PostgreSQL + Auth)
- **Migrations:** Flyway (runs automatically on backend startup)

## Prerequisites

- Node.js 20 LTS
- npm 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local dev)

## Local Development

```bash
# 1. Clone the repo
git clone <repo-url>
cd SoumyaElectricals

# 2. Install all workspace dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example backend/.env
cp .env.example frontend/.env
# Edit backend/.env and frontend/.env with real values

# 4. Start local Supabase (runs Postgres + Auth + Studio in Docker)
npx supabase start

# 5. Start the backend (Flyway migrations run automatically on boot)
npm run dev:backend

# 6. Start the frontend (in a separate terminal)
npm run dev:frontend
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001/api/v1  
Supabase Studio: http://localhost:54323

## Workspaces

| Workspace | Description |
|-----------|-------------|
| `backend/` | Node.js + Express API |
| `frontend/` | React SPA |
| `shared/` | Shared Zod schemas and TypeScript types |

## Running Tests

```bash
npm run test
```

## Linting

```bash
npm run lint
```
