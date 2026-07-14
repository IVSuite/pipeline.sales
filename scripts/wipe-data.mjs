// One-time wipe of all business data (keeps user accounts/profiles).
// Usage: node scripts/wipe-data.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
