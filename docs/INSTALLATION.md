# Installation Guide

## Prerequisites

- Node.js 20.9+ and npm
- A free [Supabase](https://supabase.com) account

## 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick an organization, name, database password, and region. Wait for provisioning (~2 minutes).
3. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — never commit it or expose it to the browser)

## 2. Run the database migrations

Open **SQL Editor** in the Supabase dashboard and run these files **in order**, each as its own query:

1. `supabase/migrations/0001_init.sql` — tables, enums, indexes, triggers.
2. `supabase/migrations/0002_rls_policies.sql` — Row Level Security policies for RBAC.
3. `supabase/seed.sql` — demo users, companies, leads, customers, deals (all 7 stages), tasks, notes, activities.

(Alternatively, if you have the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker installed, `supabase link` to your project and `supabase db push` accomplishes the same thing for the two migration files, then run `seed.sql` separately via the SQL editor or `psql`.)

After seeding, you should be able to sign in with:

| Email | Password | Role |
|---|---|---|
| admin@demo.com | Password123! | admin |
| manager@demo.com | Password123! | manager |
| rep1@demo.com | Password123! | sales_rep |
| rep2@demo.com | Password123! | sales_rep |

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the three values from step 1:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`.env.local` is gitignored — never commit real credentials.

## 4. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`. Sign in with one of the demo accounts above, or use **Sign up** to create a new account (note: the signup form lets you pick your own role for demo convenience — in a real deployment, remove the role selector from `src/components/shared/auth-form.tsx` and have an admin assign roles from **Settings** instead).

## 5. Verify the core flows

- **Dashboard** — stats and monthly chart should show non-zero numbers from the seed data.
- **Pipeline** (`/deals`) — drag a card between columns; reload the page and confirm it stayed in the new column (i.e. it persisted to Postgres, not just local state).
- **Leads / Customers / Companies / Tasks** — create, edit, delete, search, and filter.
- **Detail pages** — open a lead/customer/company/deal and add a note or log a call/email/meeting; it should appear in the timeline immediately.
- **Global search** — type at least 2 characters in the topbar search box.
- **Dark mode** — toggle via the sun/moon icon in the topbar.
- **RBAC** — sign in as `rep1@demo.com` and try to edit a lead assigned to `rep2@demo.com`; the update should be rejected by Postgres RLS (the API will return whatever error Postgres/PostgREST raises for the blocked row).

## Troubleshooting

- **"Invalid API key" / auth errors** — double check you copied the `anon` key (not the `service_role` key) into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Empty dashboard / no data** — confirm `supabase/seed.sql` ran without errors; check the Supabase **Table Editor** to see if rows exist.
- **Sign-up succeeds but you're stuck on a blank profile** — the `handle_new_user` trigger (in `0001_init.sql`) auto-creates a `profiles` row on signup. If you ran the migrations out of order or modified them, verify the trigger exists under **Database → Triggers** on `auth.users`.
- **Type errors mentioning `RouteContext` / `PageProps`** — these are Next.js 16 generated ambient types; run `npm run dev` or `npm run build` once so Next.js can generate them (`next typegen` runs automatically).
