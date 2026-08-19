# Deployment Guide

The app deploys as two pieces: **Supabase** hosts the database/auth (already done if you followed [INSTALLATION.md](INSTALLATION.md)), and **Vercel** hosts the Next.js frontend + API routes.

## 1. Push the code to a Git repository

Vercel deploys from Git (GitHub, GitLab, or Bitbucket).

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

## 2. Create the Vercel project

1. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
2. Framework preset: **Next.js** (auto-detected).
3. Build command / output: leave as default (`next build`).
4. Before deploying, add the environment variables (**Settings → Environment Variables**), for both **Production** and **Preview**:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://hpgfwtezgrzbzqsdotkt.supabase.co` (IV-Suite central project) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The IV-Suite publishable key |
   | `NEXT_PUBLIC_SUPABASE_DB_SCHEMA` | `crm` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Only if something server-side actually needs to bypass RLS (mark it **Sensitive**) |

   `NEXT_PUBLIC_SUPABASE_DB_SCHEMA` is not optional on IV-Suite: the CRM tables
   live in the `crm` schema, and `public` there belongs to the quotation app.
   Omit it and every query 404s with `PGRST205`.

5. Click **Deploy**.

## 3. Configure Supabase for your production domain

1. In the Supabase dashboard, go to **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel production URL (e.g. `https://your-app.vercel.app`).
3. Add the same URL (and any preview-deployment wildcard you want, e.g. `https://your-app-*.vercel.app`) to **Redirect URLs**.

This matters for auth flows that redirect back to your app (password reset, email confirmation, etc.) — without it, Supabase will reject or mis-redirect those flows in production.

## 4. Confirm production data isolation

Sign in on the deployed URL and confirm you're hitting the same Supabase project as local dev (e.g. a lead created in production appears in the Supabase Table Editor). Every deployment (local, preview, production) that shares the same `NEXT_PUBLIC_SUPABASE_URL` reads/writes the same database by design — that's what makes this "cloud-based, same database from any device."

If you want **separate** staging vs. production data, create a second Supabase project and point Vercel's **Preview** environment variables at it instead of production's.

## 5. Ongoing schema changes

The files under `supabase/migrations/` describe the CRM as it was built on the
standalone `pipeline-sales-crm` project, where everything sat in `public`. On
IV-Suite the same tables live in `crm`, so those files are **history, not a
runnable migration set** — do not `supabase db push` them at the central
project, or you will create a second copy of the CRM in `public`.

New schema changes must be written as `crm`-qualified SQL and applied to the
IV-Suite project deliberately (SQL Editor, or the CLI linked to
`hpgfwtezgrzbzqsdotkt`), before or as part of deploying the corresponding code
change. There is no automatic migration runner wired into the Vercel build.
Remember that this database is shared with the other IV-Suite modules: keep
changes inside the `crm` schema.

## 6. Custom domain (optional)

In Vercel: **Settings → Domains** → add your domain and follow the DNS instructions. Then repeat step 3 (update Supabase Site URL / Redirect URLs) to match the custom domain.
