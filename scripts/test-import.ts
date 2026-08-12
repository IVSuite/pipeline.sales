// Standalone unit tests for the pure import logic. No DB, no network.
// Run: node --experimental-strip-types scripts/test-import.ts
import {
  suggestMapping,
  parseCsv,
  validateMappedRow,
  applyMapping,
  normalizeEmail,
  normalizeHeader,
  CUSTOMER_IMPORT_FIELDS,
  type ColumnMapping,
} from "../src/lib/import/customer-import.ts";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error("  ✗ FAIL:", msg);
  }
}
function eq(a: unknown, b: unknown, msg: string) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
}

console.log("== normalizeHeader ==");
eq(normalizeHeader("Full Name"), "full name", "lowercases + spaces");
eq(normalizeHeader("E-mail_Address"), "e mail address", "separators collapse");
eq(normalizeHeader("Phone #"), "phone", "strips symbols");

console.log("== suggestMapping ==");
{
  const m = suggestMapping(["Full Name", "Email Address", "Mobile", "Company Name"]);
  eq(m.full_name, 0, "full_name -> 0");
  eq(m.email, 1, "email -> 1");
  eq(m.phone, 2, "phone (mobile) -> 2");
  eq(m.company, 3, "company -> 3");
}
{
  const m = suggestMapping(["name", "e-mail", "tel", "organisation"]);
  eq(m.full_name, 0, "name -> 0");
  eq(m.email, 1, "e-mail -> 1");
  eq(m.phone, 2, "tel -> 2");
  eq(m.company, 3, "organisation -> 3");
}
{
  // Unmatched columns leave fields null; no double-assignment.
  const m = suggestMapping(["Customer", "Notes", "Xyz"]);
  eq(m.full_name, 0, "customer -> full_name");
  eq(m.email, null, "no email column");
  eq(m.company, null, "no company column");
}

console.log("== parseCsv ==");
{
  const csv = `Full Name,Email,Phone,Company
Jane Cooper,jane@acme.com,555-1000,Acme
"Doe, John",john@x.com,555-2000,"Big, Co"
`;
  const { headers, rows } = parseCsv(csv);
  eq(headers, ["Full Name", "Email", "Phone", "Company"], "headers");
  eq(rows.length, 2, "2 data rows");
  eq(rows[1][0], "Doe, John", "quoted comma preserved");
  eq(rows[1][3], "Big, Co", "quoted company comma preserved");
}
{
  // Embedded newline + escaped quote inside a quoted field.
  const csv = `Name,Note\n"Line1\nLine2","She said ""hi"""\n`;
  const { rows } = parseCsv(csv);
  eq(rows.length, 1, "embedded newline stays one row");
  eq(rows[0][0], "Line1\nLine2", "embedded newline preserved");
  eq(rows[0][1], 'She said "hi"', "escaped quotes unescaped");
}
{
  // BOM + CRLF + trailing blank line.
  const csv = "﻿A,B\r\n1,2\r\n\r\n";
  const { headers, rows } = parseCsv(csv);
  eq(headers, ["A", "B"], "BOM stripped");
  eq(rows.length, 1, "blank trailing line dropped");
}

console.log("== validateMappedRow ==");
{
  const v = validateMappedRow({ full_name: "Jane", email: "jane@acme.com", phone: "123", company: "Acme" });
  assert(v.valid, "valid row passes");
  eq(v.data.email, "jane@acme.com", "email kept");
}
{
  const v = validateMappedRow({ full_name: "", email: "x@y.com" });
  assert(!v.valid, "missing name fails");
  assert(v.errors.some((e) => e.field === "full_name"), "name error present");
}
{
  const v = validateMappedRow({ full_name: "Bob", email: "not-an-email" });
  assert(!v.valid, "bad email fails");
  assert(v.errors.some((e) => e.field === "email"), "email error present");
}
{
  const v = validateMappedRow({ full_name: "Bob", email: "" });
  assert(v.valid, "empty email is allowed (optional)");
  eq(v.data.email, null, "empty email -> null");
}
{
  const v = validateMappedRow({ full_name: "x".repeat(201) });
  assert(!v.valid, "over-long name fails");
}

console.log("== applyMapping ==");
{
  const mapping: ColumnMapping = { full_name: 1, email: 0, phone: null, company: 2 };
  const out = applyMapping(["jane@acme.com", "Jane Cooper", "Acme"], mapping);
  eq(out.full_name, "Jane Cooper", "full_name from col 1");
  eq(out.email, "jane@acme.com", "email from col 0");
  eq(out.phone, undefined, "phone unmapped -> undefined");
  eq(out.company, "Acme", "company from col 2");
}

console.log("== normalizeEmail (dedupe key) ==");
eq(normalizeEmail("  Jane@ACME.com "), "jane@acme.com", "trim + lowercase");
eq(normalizeEmail(""), null, "empty -> null");
eq(normalizeEmail(null), null, "null -> null");

console.log("== end-to-end: mixed valid / invalid / duplicate ==");
{
  const csv = `Full Name,Email,Phone,Company
Jane Cooper,jane@acme.com,555-1000,Acme
,missing@name.com,555,NoName Co
Bob Bad,bad-email,555,SomeCo
Dup Person,JANE@acme.com,555-9999,Acme
Sole Trader,,555-0000,
`;
  const { headers, rows } = parseCsv(csv);
  const mapping = suggestMapping(headers);
  const seen = new Set<string>();
  let valid = 0,
    invalid = 0,
    dupes = 0;
  for (const row of rows) {
    const v = validateMappedRow(applyMapping(row, mapping));
    if (!v.valid) {
      invalid++;
      continue;
    }
    const ne = normalizeEmail(v.data.email);
    if (ne && seen.has(ne)) {
      dupes++;
      continue;
    }
    if (ne) seen.add(ne);
    valid++;
  }
  eq(valid, 2, "2 truly-importable (Jane + Sole Trader)");
  eq(invalid, 2, "2 invalid (missing name, bad email)");
  eq(dupes, 1, "1 in-file duplicate (case-insensitive email)");
}

console.log("== fields sanity ==");
eq(CUSTOMER_IMPORT_FIELDS.find((f) => f.key === "full_name")?.required, true, "full_name required");
eq(CUSTOMER_IMPORT_FIELDS.filter((f) => f.required).length, 1, "only full_name required");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
