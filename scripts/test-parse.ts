// Builds a ~600-row .xlsx fixture, reads it back with exceljs (mirroring the
// server parser), and simulates the full import decision pipeline (valid /
// duplicate / invalid, skip vs update). No DB writes.
// Run: node --experimental-strip-types scripts/test-parse.ts
import { writeFileSync } from "node:fs";
import ExcelJS from "exceljs";
import {
  suggestMapping,
  applyMapping,
  validateMappedRow,
  parseCsv,
  normalizeEmail,
  normalizeHeader,
} from "../src/lib/import/customer-import.ts";

let pass = 0,
  fail = 0;
const ok = (c: boolean, m: string) => (c ? pass++ : (fail++, console.error("  ✗", m)));

// Mirror of parse-spreadsheet.ts cell coercion + row normalization, so the
// fixture round-trip exercises the same shape the server produces.
function readXlsx(buf: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  const wb = new ExcelJS.Workbook();
  return wb.xlsx.load(buf).then(() => {
    const sheet = wb.worksheets[0];
    const matrix: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as unknown[];
      const cells: string[] = [];
      for (let c = 1; c < values.length; c++) cells.push(values[c] == null ? "" : String(values[c]).trim());
      matrix.push(cells);
    });
    const headers = matrix[0].map((h) => h.trim());
    const width = headers.length;
    const rows = matrix.slice(1).map((r) => {
      const p = r.slice(0, width);
      while (p.length < width) p.push("");
      return p;
    });
    return { headers, rows };
  });
}

// --- Build a ~600-row .xlsx fixture -----------------------------------------
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Customers");
ws.addRow(["Full Name", "Email", "Phone", "Company"]);
const companies = ["Acme Industries", "Nile Trading Co.", "Delta Corp", "Orbit LLC", "Zephyr Group"];
for (let i = 1; i <= 590; i++)
  ws.addRow([`Customer ${i}`, `customer${i}@example.com`, `+1 555 ${String(1000 + i).padStart(4, "0")}`, companies[i % companies.length]]);
for (let i = 1; i <= 5; i++) ws.addRow([`Dup Customer ${i}`, `CUSTOMER${i}@EXAMPLE.COM`, "+1 555 9999", "Acme Industries"]);
ws.addRow(["", "noname@example.com", "555", "Acme Industries"]);
ws.addRow(["Bad Email Person", "not-an-email", "555", "Delta Corp"]);
ws.addRow(["", "", "555", ""]);
const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
writeFileSync("scripts/fixtures-customers-600.xlsx", Buffer.from(buf));

const parsed = await readXlsx(buf);
ok(parsed.headers.join(",") === "Full Name,Email,Phone,Company", "xlsx headers detected");
ok(parsed.rows.length === 598, `xlsx data rows=${parsed.rows.length} (want 598)`);

const mapping = suggestMapping(parsed.headers);
ok(mapping.full_name === 0 && mapping.email === 1 && mapping.phone === 2 && mapping.company === 3, "auto-mapping correct");

// --- Simulate the server import decision logic (no DB) -----------------------
function simulate(rows: string[][], mode: "skip" | "update", existing: string[] = []) {
  const dbEmails = new Set(existing.map((e) => normalizeEmail(e)).filter((e): e is string => !!e));
  const dbCompanies = new Set<string>();
  let imported = 0,
    updated = 0,
    skipped = 0,
    failed = 0;
  const seen = new Set<string>();
  for (const row of rows) {
    const v = validateMappedRow(applyMapping(row, mapping));
    if (!v.valid) {
      failed++;
      continue;
    }
    if (v.data.company) dbCompanies.add(normalizeHeader(v.data.company));
    const ne = normalizeEmail(v.data.email);
    if (ne && seen.has(ne)) {
      skipped++;
      continue;
    }
    if (ne && dbEmails.has(ne)) {
      if (mode === "update") updated++;
      else skipped++;
      seen.add(ne);
      continue;
    }
    if (ne) {
      seen.add(ne);
      dbEmails.add(ne);
    }
    imported++;
  }
  return { imported, updated, skipped, failed, companies: dbCompanies.size };
}

const r = simulate(parsed.rows, "skip");
ok(r.imported === 590, `imported=${r.imported} (want 590 unique)`);
ok(r.skipped === 5, `skipped=${r.skipped} (want 5 dup emails, case-insensitive)`);
ok(r.failed === 3, `failed=${r.failed} (want 3 invalid)`);
ok(r.companies === 5, `distinct companies=${r.companies} (want 5)`);

// --- Small mixed CSV sample --------------------------------------------------
const smallCsv = `Full Name,Email,Phone,Company
Jane Cooper,jane@acme.com,555-1000,Acme
"Doe, John",john@x.com,555-2000,"Big, Co"
,orphan@x.com,555,NoName
Bob Bad,bad-email,555,SomeCo
Dup Jane,JANE@ACME.COM,555,Acme
`;
const csv = parseCsv(smallCsv);
ok(csv.rows.length === 5, `csv rows=${csv.rows.length} (want 5)`);
const rc = simulate(csv.rows, "skip");
ok(rc.imported === 2, `csv imported=${rc.imported} (want 2: Jane + Doe)`);
ok(rc.skipped === 1, `csv skipped=${rc.skipped} (want 1: Dup Jane)`);
ok(rc.failed === 2, `csv failed=${rc.failed} (want 2)`);

// --- Update mode against an already-existing customer ------------------------
const ru = simulate(csv.rows, "update", ["jane@acme.com"]);
ok(ru.updated === 1 && ru.imported === 1, `update mode: updated=${ru.updated} imported=${ru.imported} (want 1/1)`);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
