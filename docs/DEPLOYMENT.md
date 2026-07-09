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
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (mark it **Sensitive**) |

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

When you add new migrations under `supabase/migrations/`, run them against the production Supabase project's SQL Editor (or via `supabase db push` with the CLI linked to that project) before or as part of deploying the corresponding code change. There's no automatic migration runner wired into the Vercel build — treat schema changes as a manual, ordered step alongside deploys.

## 6. Custom domain (optional)

In Vercel: **Settings → Domains** → add your domain and follow the DNS instructions. Then repeat step 3 (update Supabase Site URL / Redirect URLs) to match the custom domain.
