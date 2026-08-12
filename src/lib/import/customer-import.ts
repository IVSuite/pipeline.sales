// Pure, dependency-free helpers for the customer bulk-import feature.
//
// Everything here is framework-agnostic and side-effect-free so it can be unit
// tested in isolation (see scripts/test-import.mjs) and shared between the
// browser wizard and the server route handlers. No Supabase, no React, no I/O.

/** A field on the `customers` table that a spreadsheet column can map onto. */
export interface ImportField {
  /** Column key on the customers table. */
  key: "full_name" | "email" | "phone" | "company";
  label: string;
  required: boolean;
  /** Lower-cased header aliases used for auto-detection. */
  aliases: string[];
  example: string;
}

// Only fields that make sense for a spreadsheet import. `company` is resolved to
// a company_id server-side (find-or-create by name); the rest map 1:1 to columns
// on public.customers. assigned_to / created_by are set to the importing user.
export const CUSTOMER_IMPORT_FIELDS: ImportField[] = [
  {
    key: "full_name",
    label: "Full name",
    required: true,
    aliases: ["full name", "name", "customer", "customer name", "contact", "contact name", "client", "client name"],
    example: "Jane Cooper",
  },
  {
    key: "email",
    label: "Email",
    required: false,
    aliases: ["email", "e-mail", "email address", "mail", "e mail"],
    example: "jane@acme.com",
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    aliases: ["phone", "phone number", "telephone", "tel", "mobile", "cell", "contact number"],
    example: "+1 555 010 4477",
  },
  {
    key: "company",
    label: "Company",
    required: false,
    aliases: ["company", "company name", "organization", "organisation", "org", "account", "business"],
    example: "Acme Industries",
  },
];

export type FieldKey = ImportField["key"];

/** Maps each importable field to the source column index, or null if unmapped. */
export type ColumnMapping = Record<FieldKey, number | null>;

/** Normalizes a header/cell for fuzzy comparison: lower-case, collapse non-alphanumerics to single spaces. */
export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Suggests a column mapping from a list of source headers by matching against
 * each field's aliases. Exact normalized matches win over substring matches, and
 * a source column is never assigned to two fields.
 */
export function suggestMapping(headers: string[]): ColumnMapping {
  const norm = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: ColumnMapping = { full_name: null, email: null, phone: null, company: null };

  // Pass 1: exact alias / key matches.
  for (const field of CUSTOMER_IMPORT_FIELDS) {
    const candidates = [field.key.replace(/_/g, " "), field.label.toLowerCase(), ...field.aliases].map(normalizeHeader);
    const idx = norm.findIndex((h, i) => !used.has(i) && candidates.includes(h));
    if (idx !== -1) {
      mapping[field.key] = idx;
      used.add(idx);
    }
  }

  // Pass 2: substring / contains matches for anything still unmapped.
  for (const field of CUSTOMER_IMPORT_FIELDS) {
    if (mapping[field.key] !== null) continue;
    const candidates = [field.key.replace(/_/g, " "), ...field.aliases].map(normalizeHeader);
    const idx = norm.findIndex(
      (h, i) => !used.has(i) && h.length > 0 && candidates.some((c) => h.includes(c) || c.includes(h))
    );
    if (idx !== -1) {
      mapping[field.key] = idx;
      used.add(idx);
    }
  }

  return mapping;
}

/**
 * Parses CSV text into headers + rows (array-of-cells). Handles quoted fields,
 * embedded commas/newlines, and "" escaped quotes. Trailing empty lines are
 * dropped. Fully RFC-4180-ish without pulling in a dependency.
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      // Handle CRLF as a single break.
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      records.push(record);
      record = [];
    } else {
      field += ch;
    }
  }
  // Flush the final field/record if the file didn't end with a newline.
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  // Drop fully-empty records (e.g. blank trailing lines).
  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1);
  return { headers, rows };
}

export interface RowError {
  field: FieldKey | "row";
  message: string;
}

export interface ValidatedRow {
  valid: boolean;
  data: {
    full_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  errors: RowError[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizes an email for duplicate comparison: trimmed + lower-cased. */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

/**
 * Validates one mapped row. `raw` holds the string cell values already pulled
 * out per field. Mirrors the constraints in customerSchema (full_name required,
 * valid email, length caps) but tailored to the flat spreadsheet shape.
 */
export function validateMappedRow(raw: Partial<Record<FieldKey, string>>): ValidatedRow {
  const errors: RowError[] = [];

  const full_name = (raw.full_name ?? "").trim();
  const emailRaw = (raw.email ?? "").trim();
  const phone = (raw.phone ?? "").trim();
  const company = (raw.company ?? "").trim();

  if (!full_name) {
    errors.push({ field: "full_name", message: "Full name is required" });
  } else if (full_name.length > 200) {
    errors.push({ field: "full_name", message: "Full name exceeds 200 characters" });
  }

  if (emailRaw) {
    if (emailRaw.length > 200) {
      errors.push({ field: "email", message: "Email exceeds 200 characters" });
    } else if (!EMAIL_RE.test(emailRaw)) {
      errors.push({ field: "email", message: `Invalid email: "${emailRaw}"` });
    }
  }

  if (phone && phone.length > 40) {
    errors.push({ field: "phone", message: "Phone exceeds 40 characters" });
  }

  if (company && company.length > 200) {
    errors.push({ field: "company", message: "Company exceeds 200 characters" });
  }

  return {
    valid: errors.length === 0,
    data: {
      full_name,
      email: emailRaw || null,
      phone: phone || null,
      company: company || null,
    },
    errors,
  };
}

/** Pulls the per-field string cells out of a raw row given the active mapping. */
export function applyMapping(row: string[], mapping: ColumnMapping): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {};
  for (const field of CUSTOMER_IMPORT_FIELDS) {
    const idx = mapping[field.key];
    if (idx !== null && idx !== undefined) {
      out[field.key] = row[idx] ?? "";
    }
  }
  return out;
}
