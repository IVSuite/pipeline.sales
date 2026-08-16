import "server-only";

import ExcelJS from "exceljs";
import { parseCsv } from "./customer-import";

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
  /** Total data rows detected (before any truncation). */
  totalRows: number;
  truncated: boolean;
}

/** Hard cap on rows returned to the client, to keep payloads/memory bounded. */
export const MAX_IMPORT_ROWS = 10000;

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  // Rich text / hyperlink / formula result objects.
  if (typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if (typeof v.text === "string") return v.text.trim();
    if ("result" in v && v.result != null) return String(v.result).trim();
    if (Array.isArray(v.richText)) return (v.richText as { text: string }[]).map((r) => r.text).join("").trim();
    if (typeof v.hyperlink === "string") return String(v.hyperlink).trim();
  }
  return String(value).trim();
}

/** Parses an .xlsx buffer into headers + rows using the first worksheet. */
export async function parseXlsx(buffer: ArrayBuffer): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [], totalRows: 0, truncated: false };

  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as ExcelJS.CellValue[]; // 1-indexed; [0] is empty
    const cells: string[] = [];
    for (let c = 1; c < values.length; c++) {
      cells.push(cellToString(values[c]));
    }
    matrix.push(cells);
  });

  // Drop leading fully-empty rows, then treat the first non-empty row as headers.
  const firstNonEmpty = matrix.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (firstNonEmpty === -1) return { headers: [], rows: [], totalRows: 0, truncated: false };

  const headers = matrix[firstNonEmpty].map((h) => h.trim());
  const width = headers.length;
  const allRows = matrix
    .slice(firstNonEmpty + 1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    // Normalize each row to the header width.
    .map((r) => {
      const padded = r.slice(0, width);
      while (padded.length < width) padded.push("");
      return padded;
    });

  const totalRows = allRows.length;
  const rows = allRows.slice(0, MAX_IMPORT_ROWS);
  return { headers, rows, totalRows, truncated: totalRows > rows.length };
}

/** Parses a CSV/TSV buffer into headers + rows. */
export function parseCsvBuffer(buffer: ArrayBuffer): ParsedSheet {
  const text = new TextDecoder("utf-8").decode(buffer);
  const { headers, rows } = parseCsv(text);
  const width = headers.length;
  const normalized = rows.map((r) => {
    const padded = r.slice(0, width);
    while (padded.length < width) padded.push("");
    return padded;
  });
  const totalRows = normalized.length;
  const capped = normalized.slice(0, MAX_IMPORT_ROWS);
  return { headers, rows: capped, totalRows, truncated: totalRows > capped.length };
}

/** Dispatches to the right parser based on file name / extension. */
export async function parseSpreadsheet(fileName: string, buffer: ArrayBuffer): Promise<ParsedSheet> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    return parseCsvBuffer(buffer);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    return parseXlsx(buffer);
  }
  throw new Error("Unsupported file type. Please upload a .xlsx or .csv file.");
}

/** Core template builder: header row from `fields` + one row per example object. */
async function buildTemplate(
  fields: { key: string; label: string; required: boolean }[],
  sheetName: string,
  exampleRows: Record<string, string>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pipeline CRM";
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = fields.map((f) => ({
    header: f.required ? `${f.label} *` : f.label,
    key: f.key,
    width: Math.max(18, f.label.length + 6),
  }));

  // Style the header row.
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };

  for (const row of exampleRows) sheet.addRow(row);

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}

/** Builds a downloadable .xlsx template using the actual importable customer fields. */
export async function buildTemplateXlsx(): Promise<Buffer> {
  const { CUSTOMER_IMPORT_FIELDS } = await import("./customer-import");
  // Two example rows so users see the expected shape (unchanged Customers template).
  return buildTemplate(CUSTOMER_IMPORT_FIELDS, "Customers", [
    { full_name: "Jane Cooper", email: "jane@acme.com", phone: "+1 555 010 4477", company: "Acme Industries" },
    { full_name: "Omar Haddad", email: "omar@nileco.com", phone: "+20 100 234 5678", company: "Nile Trading Co." },
  ]);
}

/** Builds a downloadable .xlsx template for any field set (Leads, Companies, …). */
export async function buildTemplateXlsxForFields(
  fields: { key: string; label: string; required: boolean; example: string }[],
  sheetName: string
): Promise<Buffer> {
  // One example row derived from each field's example value.
  const example: Record<string, string> = {};
  for (const f of fields) example[f.key] = f.example;
  return buildTemplate(fields, sheetName, [example]);
}
