// Unit tests for per-lead deal aggregation.
// Run: node --experimental-strip-types scripts/test-deal-stats.ts
import { aggregateDealStatsByLead } from "../src/lib/deal-stats.ts";

let pass = 0,
  fail = 0;
const ok = (c: boolean, m: string) => (c ? pass++ : (fail++, console.error("  ✗", m)));

// Basic count + sum per lead
{
  const m = aggregateDealStatsByLead([
    { lead_id: "L1", value: 100 },
    { lead_id: "L1", value: 250 },
    { lead_id: "L2", value: 40 },
  ]);
  ok(m.get("L1")?.count === 2, "L1 count = 2");
  ok(m.get("L1")?.total === 350, "L1 total = 350");
  ok(m.get("L2")?.count === 1, "L2 count = 1");
  ok(m.get("L2")?.total === 40, "L2 total = 40");
}

// Leads with no deals are absent (caller defaults to 0/0)
{
  const m = aggregateDealStatsByLead([{ lead_id: "L1", value: 10 }]);
  ok(m.get("L9") === undefined, "lead with no deals absent");
}

// Null lead_id rows (deals not linked to a lead) are ignored
{
  const m = aggregateDealStatsByLead([
    { lead_id: null, value: 999 },
    { lead_id: "L1", value: 10 },
  ]);
  ok(m.size === 1 && m.get("L1")?.total === 10, "null lead_id ignored");
}

// String / null / non-numeric values coerce to number (0 for bad)
{
  const m = aggregateDealStatsByLead([
    { lead_id: "L1", value: "100.5" },
    { lead_id: "L1", value: null },
    { lead_id: "L1", value: "abc" },
  ]);
  ok(m.get("L1")?.count === 3, "counts all rows regardless of value");
  ok(m.get("L1")?.total === 100.5, "string coerced, null/NaN => 0");
}

// Empty input
{
  const m = aggregateDealStatsByLead([]);
  ok(m.size === 0, "empty input -> empty map");
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
