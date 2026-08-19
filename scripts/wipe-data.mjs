// One-time wipe of all business data (keeps user accounts/profiles).
// Usage: node scripts/wipe-data.mjs --i-understand-this-deletes-all-crm-data
//
// DANGER: this app now points at the SHARED IV-Suite database, where other
// modules live alongside the CRM. An accidental run here destroys production
// CRM data that no longer has a separate backend to fall back on — hence the
// explicit opt-in flag and the printed target below.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const CONFIRM_FLAG = "--i-understand-this-deletes-all-crm-data";

if (!process.argv.includes(CONFIRM_FLAG)) {
  console.error(
    `Refusing to run. This permanently deletes every lead, company, deal, task,\n` +
      `note, activity and notification from the configured database.\n\n` +
      `Re-run with ${CONFIRM_FLAG} if that is genuinely what you want.`
  );
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);

const schema = env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "crm";

console.warn(`Target: ${env.NEXT_PUBLIC_SUPABASE_URL} — schema "${schema}"`);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema },
});

// FK-safe order: children first.
const tables = ["notifications", "activities", "notes", "tasks", "deals", "leads", "customers", "companies"];

for (const table of tables) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) {
    console.error(`FAILED ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✔ ${table}: ${count} rows deleted`);
}

console.log("Done. All business data wiped; user accounts kept.");
