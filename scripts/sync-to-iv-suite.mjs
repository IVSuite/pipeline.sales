// Copy the Pipeline CRM delta from the retired standalone project
// (`pipeline-sales-crm`, tables in `public`) into the IV-Suite central project
// (`crm` schema), preserving row ids. Built for the cutover step: run it once
// after writes to the old project have stopped, immediately before flipping the
// Vercel env.
//
//   Dry run (default, writes nothing):
//     node scripts/sync-to-iv-suite.mjs
//   Apply:
//     node scripts/sync-to-iv-suite.mjs --apply
//
// Required env (service_role keys — pass them inline, never commit them):
//   OLD_SUPABASE_URL, OLD_SERVICE_KEY      → https://qrzzuxhclqcaqykbqara.supabase.co
//   IVSUITE_SUPABASE_URL, IVSUITE_SERVICE_KEY → https://hpgfwtezgrzbzqsdotkt.supabase.co
//
// Safety properties:
//   * Never deletes. Rows that exist in `crm` but not in the source are
//     reported and left alone — deleting them is a separate, explicit decision.
//   * Only touches rows that are missing or genuinely different; identical rows
//     are skipped, so re-running is a no-op.
//   * Tables are written parents-first so foreign keys always resolve.
//   * Dry run prints the exact plan; nothing is written without --apply.
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing required env var ${k}`); process.exit(1); }
  return v;
};

const src = createClient(need("OLD_SUPABASE_URL"), need("OLD_SERVICE_KEY"), {
  db: { schema: "public" }, auth: { persistSession: false },
});
const dst = createClient(need("IVSUITE_SUPABASE_URL"), need("IVSUITE_SERVICE_KEY"), {
  db: { schema: "crm" }, auth: { persistSession: false },
});

// Parents before children, so every FK target exists by the time it is needed.
const TABLES = [
  "profiles", "companies", "leads", "customers",
  "deals", "tasks", "notes", "activities", "notifications",
];

const PAGE = 1000;

async function fetchAll(client, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

// Field-by-field comparison; `updated_at` alone is not enough, since not every
// table has it (activities, notifications) and a restored row can carry an old
// timestamp with changed content.
const differs = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const x = a[k], y = b[k];
    if (x === y) continue;
    if (x == null && y == null) continue;
    if (JSON.stringify(x) !== JSON.stringify(y)) return k;
  }
  return null;
};

console.log(APPLY ? "MODE: APPLY — this will write to IV-Suite\n" : "MODE: dry run — nothing will be written\n");

const plan = [];
let orphanTotal = 0;

for (const table of TABLES) {
  const [source, target] = await Promise.all([fetchAll(src, table), fetchAll(dst, table)]);
  const byId = new Map(target.map((r) => [r.id, r]));

  const inserts = [], updates = [];
  for (const row of source) {
    const existing = byId.get(row.id);
    if (!existing) { inserts.push(row); continue; }
    const changed = differs(row, existing);
    if (changed) updates.push({ row, changed });
  }
  const orphans = target.filter((r) => !source.some((s) => s.id === r.id));
  orphanTotal += orphans.length;

  plan.push({ table, source: source.length, target: target.length, inserts, updates, orphans });

  const flag = orphans.length ? `  ⚠ ${orphans.length} row(s) only in crm` : "";
  console.log(
    `${table.padEnd(14)} source=${String(source.length).padStart(4)} crm=${String(target.length).padStart(4)}` +
    `  → insert ${inserts.length}, update ${updates.length}${flag}`
  );
  for (const u of updates.slice(0, 10)) console.log(`      update ${u.row.id} (differs on "${u.changed}")`);
  for (const o of orphans.slice(0, 10)) console.log(`      only-in-crm ${o.id} — left untouched`);
}

const totalWrites = plan.reduce((n, p) => n + p.inserts.length + p.updates.length, 0);
console.log(`\n${totalWrites} row(s) to write across ${TABLES.length} tables.`);
if (orphanTotal) {
  console.log(
    `${orphanTotal} row(s) exist in crm but not in the source. This script never deletes;\n` +
    `decide on those separately before treating the cutover as complete.`
  );
}

if (!APPLY) {
  console.log("\nDry run complete. Re-run with --apply to write.");
  process.exit(0);
}
if (!totalWrites) {
  console.log("\nNothing to do — crm already matches the source.");
  process.exit(0);
}

for (const p of plan) {
  const rows = [...p.inserts, ...p.updates.map((u) => u.row)];
  if (!rows.length) continue;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await dst.from(p.table).upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`\nFAILED on ${p.table}: ${error.message}`);
      console.error("Earlier tables are already written. Fix the cause and re-run —");
      console.error("the script is idempotent, so it will resume from what is missing.");
      process.exit(1);
    }
  }
  console.log(`✔ ${p.table}: ${rows.length} row(s) written`);
}

// Re-read and confirm the two sides now agree.
console.log("\nVerifying…");
let bad = 0;
for (const table of TABLES) {
  const [source, target] = await Promise.all([fetchAll(src, table), fetchAll(dst, table)]);
  const byId = new Map(target.map((r) => [r.id, r]));
  const missing = source.filter((r) => !byId.has(r.id)).length;
  const mismatched = source.filter((r) => byId.has(r.id) && differs(r, byId.get(r.id))).length;
  const ok = missing === 0 && mismatched === 0;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${table.padEnd(14)} source=${source.length} crm=${target.length} missing=${missing} mismatched=${mismatched}`);
}

console.log(bad ? `\n${bad} table(s) still out of sync — do NOT flip the Vercel env yet.` : "\nAll tables in sync. Safe to flip the Vercel env.");
process.exit(bad ? 1 : 0);
