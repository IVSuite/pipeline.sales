// Full row-level backup of the CRM tables on one Supabase project, written as
// both raw JSON (exact fidelity, for programmatic restore) and an idempotent
// SQL restore file (for the SQL editor).
//
//   SUPA_URL=... SUPA_SERVICE_KEY=... SUPA_SCHEMA=crm OUT_DIR=./backups/x \
//     node scripts/backup-crm.mjs
//
// This captures DATA only, not DDL. That is deliberate: it exists to make data
// writes reversible. Schema/RLS changes need a separate pg_dump.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const need = (k) => { const v = process.env[k]; if (!v) { console.error(`Missing ${k}`); process.exit(1); } return v; };
const URL_ = need("SUPA_URL"), KEY = need("SUPA_SERVICE_KEY");
const SCHEMA = process.env.SUPA_SCHEMA || "crm";
const OUT = need("OUT_DIR");

const db = createClient(URL_, KEY, { db: { schema: SCHEMA }, auth: { persistSession: false } });

const TABLES = ["profiles", "companies", "leads", "customers", "deals", "tasks", "notes", "activities", "notifications"];
const PAGE = 1000;

mkdirSync(OUT, { recursive: true });

const lit = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const manifest = { url: URL_, schema: SCHEMA, takenAt: new Date().toISOString(), tables: {} };
const sql = [
  `-- Row-level backup of ${SCHEMA} on ${URL_}`,
  `-- Taken ${manifest.takenAt}`,
  `-- Restore is additive: existing rows are left as they are (on conflict do nothing).`,
  `-- To force the backed-up values back over current ones, change DO NOTHING to`,
  `-- DO UPDATE, deliberately and one table at a time.`,
  `begin;`,
];

for (const table of TABLES) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select("*").range(from, from + PAGE - 1);
    if (error) { console.error(`FAILED reading ${table}: ${error.message}`); process.exit(1); }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  writeFileSync(join(OUT, `${table}.json`), JSON.stringify(rows, null, 2));
  manifest.tables[table] = rows.length;

  sql.push(``, `-- ${table}: ${rows.length} row(s)`);
  for (const r of rows) {
    const cols = Object.keys(r);
    sql.push(
      `insert into ${SCHEMA}.${table} (${cols.map((c) => `"${c}"`).join(",")}) values (` +
      cols.map((c) => lit(r[c])).join(",") + `) on conflict (id) do nothing;`
    );
  }
  console.log(`${table.padEnd(14)} ${String(rows.length).padStart(4)} row(s)`);
}

sql.push(``, `commit;`);
writeFileSync(join(OUT, "restore.sql"), sql.join("\n"));
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

const total = Object.values(manifest.tables).reduce((a, b) => a + b, 0);
console.log(`\n${total} row(s) backed up to ${OUT}`);
