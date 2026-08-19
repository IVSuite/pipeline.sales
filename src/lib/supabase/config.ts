/**
 * Backend selection for the Pipeline CRM.
 *
 * The app runs against the **IV-Suite central Supabase project**, where the CRM
 * tables live in the `crm` schema (not `public`). Every Supabase client in this
 * app must therefore pass `db.schema = DB_SCHEMA`, or PostgREST resolves table
 * names against `public` — which on IV-Suite holds the quotation app's tables,
 * not ours, and every query 404s with PGRST205.
 *
 * The schema is read from an env var so a rollback to the retired standalone
 * project (`pipeline-sales-crm`, whose tables are in `public`) is a pure env
 * change — flip `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` back and set
 * `NEXT_PUBLIC_SUPABASE_DB_SCHEMA=public`. No redeploy of changed code needed.
 *
 * It must be NEXT_PUBLIC_ because the browser client needs it too; the schema
 * name is not a secret (it is already visible in every request's Accept-Profile
 * header) and access is still gated by RLS.
 */
export const DB_SCHEMA = process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "crm";
