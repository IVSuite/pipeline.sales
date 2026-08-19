# Pipeline CRM → IV-Suite cutover runbook

Moves production off the standalone `pipeline-sales-crm` Supabase project and
onto the IV-Suite central project's `crm` schema.

| | Old (current production) | New (target) |
|---|---|---|
| Project | `pipeline-sales-crm` | **IV-Suite** |
| Ref | `qrzzuxhclqcaqykbqara` | `hpgfwtezgrzbzqsdotkt` |
| Region | eu-west-1 | eu-north-1 |
| Schema | `public` | **`crm`** |
| Shared with other apps | no | **yes** — quotation (`public`), plus `shared`, `quotation`, `hr`, `finance` |

## What is already done

- App code targets `crm` via `NEXT_PUBLIC_SUPABASE_DB_SCHEMA` on branch
  `feat/connect-iv-suite-crm`. Type check, lint and build are green, and auth,
  RLS, the nine tables, embedded joins and full CRUD were verified end-to-end
  against IV-Suite through the running app.
- `crm` is column-for-column identical to the old `public`: same table names,
  same eight enums, `leads.linkedin` present, equivalent RLS policies, and a
  byte-identical `handle_new_user`. **No database migration is required.**
- All six users already exist on IV-Suite with **the same UUIDs, the same
  password hashes, and confirmed emails**. Nobody needs re-inviting; existing
  passwords keep working. This is the part the original migration plan expected
  to be painful, and it is already solved.
- Local `.env.local` points at IV-Suite (backup of the previous file:
  `.env.local.bak.preIVsuite`).

## What is left

Only the data delta and the Vercel env flip. As of 19 Aug the delta is 4 rows
(1 lead, 1 activity, 1 company inserted; 1 company's `website` edited) — all
written to the old project on 18 Aug after the last sync. It grows for as long
as production keeps writing to the old project, which is why the sync belongs
**inside** the cutover window, not before it.

---

## Cutover

Pick a quiet window. Steps 1–4 are reversible at any point.

### 1. Stop writes to the old project

Tell the team to stop using the CRM, or put the Vercel production deployment
into maintenance. The sync is only trustworthy if nothing is writing behind it.

### 2. Back up both sides

```bash
supabase db dump --linked --data-only -f backup-old-$(date +%F).sql   # from a workdir linked to qrzzuxhclqcaqykbqara
```

Keep a copy off the machine. Do not skip this — it is the only thing that makes
step 5 safe.

### 3. Sync the delta

```bash
export OLD_SUPABASE_URL=https://qrzzuxhclqcaqykbqara.supabase.co
export IVSUITE_SUPABASE_URL=https://hpgfwtezgrzbzqsdotkt.supabase.co
export OLD_SERVICE_KEY=...        # service_role key, old project
export IVSUITE_SERVICE_KEY=...    # service_role key, IV-Suite

node scripts/sync-to-iv-suite.mjs            # dry run — prints the exact plan
node scripts/sync-to-iv-suite.mjs --apply    # writes, then verifies
```

The script never deletes, skips rows that already match, and re-verifies every
table afterwards. It ends with either `All tables in sync` or a list of tables
that are not — **do not continue past a failure**.

If it reports rows that exist in `crm` but not in the source, stop and work out
where they came from before continuing. As of the last dry run there were none.

### 4. Point Vercel at IV-Suite

Merge `feat/connect-iv-suite-crm` into `master`, then in **Vercel → Settings →
Environment Variables**, for **Production** and **Preview**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hpgfwtezgrzbzqsdotkt.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the IV-Suite publishable key (`sb_publishable_…`, in `.env.local`) |
| `NEXT_PUBLIC_SUPABASE_DB_SCHEMA` | `crm` |

`SUPABASE_SERVICE_ROLE_KEY` can be removed — nothing under `src/` uses it, and
on a shared database an unused RLS-bypassing key is only a liability.

Redeploy (an env change alone does not rebuild; these are `NEXT_PUBLIC_`, so
they are baked in at build time — **you must trigger a new deployment**).

Then in **Supabase → IV-Suite → Authentication → URL Configuration**, set the
**Site URL** to the production URL and add it to **Redirect URLs**, matching
whatever the old project had. This only affects the signup-confirmation link,
but that link is broken without it.

### 5. Verify production

- Sign in with an existing password. It should work unchanged.
- Dashboard shows the real numbers (348+ companies, not zero).
- Create a lead, edit it, delete it; confirm each in **Supabase → Table Editor
  with the schema selector set to `crm`**, not `public`.
- Open the browser console: no `PGRST205` and no RLS errors.
- Sign in as a `sales_rep` and confirm they still cannot edit another rep's
  lead.
- Hard-refresh once (Ctrl+Shift+R). The PWA service worker caches aggressively
  and can serve a pre-cutover bundle.

### 6. Only then, retire the old project

Leave `pipeline-sales-crm` **running but unused** for an agreed parallel-run
window. When you're satisfied: take a final dump, pause the project, and only
much later delete it.

---

## Rollback

Before step 4 there is nothing to roll back — the old project is still live and
authoritative.

After step 4: set the three Vercel vars back (old URL, old anon key,
`NEXT_PUBLIC_SUPABASE_DB_SCHEMA=public`) and redeploy. No code change is needed;
that is the whole reason the schema is an env var.

The catch: anything users wrote to `crm` after the flip stays on IV-Suite and
will not be in the old project. So roll back **quickly** if at all — the longer
production runs on `crm`, the more a rollback costs. `scripts/sync-to-iv-suite.mjs`
only runs old → IV-Suite; there is no reverse script.

---

## Known wrinkles (not blockers)

- **The `pipeline` schema on IV-Suite is dead weight.** It holds a frozen 6 Aug
  snapshot of this CRM from an earlier, abandoned migration attempt, and its
  `on_auth_user_created_pipeline` trigger still fires on every new signup,
  writing a junk profile row into a schema nothing reads. Harmless but untidy.
  It is shared IV-Suite territory, so removing it is a cross-module decision,
  not this app's to make.
- **`supabase/migrations/*` in this repo is history, not a runnable set.** Those
  files create the CRM in `public`. Running them against IV-Suite would build a
  second copy of the CRM in the quotation app's schema. New schema changes must
  be written `crm`-qualified and applied deliberately.
- **`scripts/wipe-data.mjs` now aims at the shared database.** It requires an
  explicit `--i-understand-this-deletes-all-crm-data` flag and prints its
  target, but treat it as live ordnance: there is no separate backend left to
  fall back on.
