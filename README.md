# Pipeline CRM

A cloud-based sales pipeline CRM: Next.js 16 (App Router, TypeScript) on the frontend and API layer, Supabase (Postgres + Auth + Row Level Security) as the shared backend. Every user reads and writes the same online database — nothing is stored locally except React Query's in-memory cache.

## Features (Phase 1 — this build)

- **Auth & RBAC** — Supabase email/password auth, three roles (`admin`, `manager`, `sales_rep`) enforced both in Postgres Row Level Security policies and in API route handlers.
- **Full CRUD** — Leads, Customers, Companies, Deals, Tasks, Notes, and Activities, all backed by REST-style API routes with Zod validation, pagination, sorting, and filtering.
- **Sales Pipeline** — Kanban board (`@dnd-kit`) with 7 stages (New Lead → Contacted → Qualified → Proposal Sent → Negotiation → Closed Won/Lost). Dragging a card updates `deals.stage` in Postgres immediately, with optimistic UI + rollback on failure.
- **Dashboard** — total leads, active/won/lost deals, revenue, a monthly sales bar chart, recent activity feed, and upcoming tasks.
- **Notes & Activity Timeline** — every lead/customer/deal/company detail page has a combined notes + logged-activity (call/email/meeting) timeline.
- **Global search** — searches leads, customers, companies, and deals from the topbar.
- **Filters** — status, priority, assigned salesperson, deal value range, date range (varies per module).
- **Premium UI** — light/dark mode (class-based, system-aware), responsive layout, data tables, loading skeletons, toast notifications, modals.

### Phase 2 roadmap (not in this build)

These were explicitly scoped out of Phase 1 so that everything shipped is fully wired and verifiable rather than a partial stub. See the plan discussion for why:

- Supabase Realtime notifications (deal stage changes, overdue tasks, new lead assignment, customer updates) — the `notifications` table and RLS policies already exist in the schema, ready for this.
- Full analytics suite (sales funnel, conversion rate, revenue trend, top salespeople, lead source breakdown).
- Excel/PDF export, CSV import.
- Calendar view, email reminders, full audit trail, real-time multi-user presence/collaboration, auto-save drafts.
- File attachments via Supabase Storage (notes/activities currently support text only).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Data fetching | TanStack Query (client cache/mutations against route handlers) |
| Forms | react-hook-form + Zod (shared schemas between client validation and API validation) |
| Tables | TanStack Table |
| Drag-and-drop | `@dnd-kit` |
| Charts | Recharts |
| Backend | Next.js Route Handlers (`src/app/api/**`) |
| Database | Supabase Postgres, Row Level Security |
| Auth | Supabase Auth (email/password), `@supabase/ssr` for session cookies |
| Deployment | Vercel (frontend/API) + Supabase (database/auth) |

## Project structure

```
src/
  app/
    (auth)/login, (auth)/signup        Public auth pages
    (dashboard)/...                    Authenticated app shell + pages
    api/**                             REST-style route handlers
  components/                          UI kit + feature components, grouped by domain
  hooks/                                React Query hooks, current-user context
  lib/
    supabase/                          Browser/server/admin Supabase clients + session refresh
    validation/                        Zod schemas shared by forms and API routes
    rbac.ts, api-utils.ts              Auth/role guards, pagination & error helpers
  types/                                Hand-written domain types + API join-shape types
supabase/
  migrations/                          SQL schema + RLS policies
  seed.sql                              Demo data (4 users, companies, leads, deals, tasks…)
docs/
  WHATS-NEXT.md, BLUEPRINT.md, …     Platform blueprint (unified system)
  API.md, INSTALLATION.md, DEPLOYMENT.md   This CRM build
```

## Quick start

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for the full walkthrough. Short version:

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL/keys
# run supabase/migrations/*.sql then supabase/seed.sql in the Supabase SQL editor
npm run dev
```

Demo accounts (after seeding), password `Password123!` for all:

| Email | Role |
|---|---|
| admin@demo.com | admin |
| manager@demo.com | manager |
| rep1@demo.com | sales_rep |
| rep2@demo.com | sales_rep |

## Docs

### Unified platform blueprint

- **[Dual approach](docs/00-dual-approach.md)** — app + database first; AI on top
- **[What's next](docs/WHATS-NEXT.md)** — merge CRM + quotation
- **[Full blueprint](docs/BLUEPRINT.md)**
- [Documentation index](docs/README.md)

### This CRM build

- [API documentation](docs/API.md)
- [Installation guide](docs/INSTALLATION.md)
- [Deployment guide](docs/DEPLOYMENT.md)
