// Pure, dependency-free helpers for the bulk-import feature.
//
// Everything here is framework-agnostic and side-effect-free so it can be unit
// tested in isolation (see scripts/test-import.mjs) and shared between the
// browser wizard and the server route handlers. No Supabase, no React, no I/O.
//
// The Customers importer shipped first; Leads and Companies reuse the exact same
// logic by passing a different field set / config. Every function defaults to the
// customer field set so existing Customers call sites are unchanged.

/** A field on a target table that a spreadsheet column can map onto. */
export interface ImportField {
  /** Column key on the target table (or a virtual key like `company` resolved server-side). */
  key: string;
  label: string;
  required: boolean;
  /** Lower-cased header aliases used for auto-detection. */
  aliases: string[];
  example: string;
  /** Max length allowed (validation). */
  maxLength?: number;
  /** Special format validation. */
  format?: "email";
}

// Only fields that make sense for a spreadsheet import. `company` is resolved to
// a company_id server-side (find-or-create by name); the rest map 1:1 to columns.
// assigned_to / created_by are set to the importing user.
export const CUSTOMER_IMPORT_FIELDS: ImportField[] = [
  {
    key: "full_name",
    label: "Full name",
    required: true,
    aliases: ["full name", "name", "customer", "customer name", "contact", "contact name", "client", "client name"],
    example: "Jane Cooper",
    maxLength: 200,
  },
  {
    key: "email",
    label: "Email",
    required: false,
    aliases: ["email", "e-mail", "email address", "mail", "e mail"],
    example: "jane@acme.com",
    maxLength: 200,
    format: "email",
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    aliases: ["phone", "phone number", "telephone", "tel", "mobile", "cell", "contact number"],
    example: "+1 555 010 4477",
    maxLength: 40,
  },
  {
    key: "company",
    label: "Company",
    required: false,
    aliases: ["company", "company name", "organization", "organisation", "org", "account", "business"],
    example: "Acme Industries",
    maxLength: 200,
  },
];

// Leads = the exact Customers fields + LinkedIn (maps to leads.linkedin).
export const LEAD_IMPORT_FIELDS: ImportField[] = [
  ...CUSTOMER_IMPORT_FIELDS,
  {
    key: "linkedin",
    label: "LinkedIn",
    required: false,
    aliases: ["linkedin", "linked in", "linkedin url", "linkedin profile", "li profile", "li url"],
    example: "https://linkedin.com/in/jane-cooper",
    maxLength: 500,
  },
];

// Companies are a different entity: the table has `name`, `phone`, `address`
// (no full_name/email/company columns). We reuse the same importer with the
// applicable fields only — company Name (dedupe key) + Phone + Address.
export const COMPANY_IMPORT_FIELDS: ImportField[] = [
  {
    key: "name",
    label: "Company name",
    required: true,
    aliases: ["company", "company name", "name", "organization", "organisation", "org", "account", "business"],
    example: "Acme Industries",
    maxLength: 200,
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    aliases: ["phone", "phone number", "telephone", "tel", "mobile", "cell", "contact number"],
    example: "+1 555 010 4477",
    maxLength: 40,
  },
  {
    key: "address",
    label: "Address",
    required: false,
    aliases: ["address", "company address", "location", "street", "billing address", "office address"],
    example: "12 Industrial Rd, Cairo",
    maxLength: 300,
  },
];

export type FieldKey = string;

/** Maps each importable field key to the source column index, or null if unmapped. */
export type ColumnMapping = Record<string, number | null>;

/** Per-entity import configuration; drives the shared dialog + routes. */
export interface ImportConfig {
  entity: "customers" | "leads" | "companies";
  fields: ImportField[];
  /** Base API path; the dialog derives `${endpoint}`, `${endpoint}/parse`, `${endpoint}/template`. */
  endpoint: string;
  title: string;
  entityNoun: string;
  entityNounPlural: string;
  /** Field key used to detect duplicates (email for people, name for companies). */
  dedupeField: string;
  /** Human label for the dedupe key, used in UI copy. */
  dedupeLabel: string;
  templateFileName: string;
  /** react-query key to invalidate on success. */
  queryKey: string;
}

export const CUSTOMER_IMPORT_CONFIG: ImportConfig = {
  entity: "customers",
  fields: CUSTOMER_IMPORT_FIELDS,
  endpoint: "/api/customers/import",
  title: "Import customers",
  entityNoun: "customer",
  entityNounPlural: "customers",
  dedupeField: "email",
  dedupeLabel: "email",
  templateFileName: "pipeline-customers-template.xlsx",
  queryKey: "customers",
};

export const LEAD_IMPORT_CONFIG: ImportConfig = {
  entity: "leads",
  fields: LEAD_IMPORT_FIELDS,
  endpoint: "/api/leads/import",
  title: "Import leads",
  entityNoun: "lead",
  entityNounPlural: "leads",
  dedupeField: "email",
  dedupeLabel: "email",
  templateFileName: "pipeline-leads-template.xlsx",
  queryKey: "leads",
};

export const COMPANY_IMPORT_CONFIG: ImportConfig = {
  entity: "companies",
  fields: COMPANY_IMPORT_FIELDS,
  endpoint: "/api/companies/import",
  title: "Import companies",
  entityNoun: "company",
  entityNounPlural: "companies",
  dedupeField: "name",
  dedupeLabel: "company name",
  templateFileName: "pipeline-companies-template.xlsx",
  queryKey: "companies",
};

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
export function suggestMapping(headers: string[], fields: ImportField[] = CUSTOMER_IMPORT_FIELDS): ColumnMapping {
  const norm = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const f of fields) mapping[f.key] = null;

  // Pass 1: exact alias / key matches.
  for (const field of fields) {
    const candidates = [field.key.replace(/_/g, " "), field.label.toLowerCase(), ...field.aliases].map(normalizeHeader);
    const idx = norm.findIndex((h, i) => !used.has(i) && candidates.includes(h));
    if (idx !== -1) {
      mapping[field.key] = idx;
      used.add(idx);
    }
  }

  // Pass 2: substring / contains matches for anything still unmapped.
  for (const field of fields) {
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
  field: string;
  message: string;
}

export interface ValidatedRow {
  valid: boolean;
  /** Trimmed value per field key, or null when empty. */
  data: Record<string, string | null>;
  errors: RowError[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizes an email for duplicate comparison: trimmed + lower-cased. */
export function normalizeEmail(email: string | null | undefined): string | null {
  return normalizeDedupeKey(email);
}

/** Normalizes any dedupe key (email or company name): trimmed + lower-cased. */
export function normalizeDedupeKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

/**
 * Validates one mapped row against the given field set. Applies required checks,
 * length caps, and email-format validation per field. Defaults to the customer
 * field set for backward compatibility.
 */
export function validateMappedRow(
  raw: Partial<Record<string, string>>,
  fields: ImportField[] = CUSTOMER_IMPORT_FIELDS
): ValidatedRow {
  const errors: RowError[] = [];
  const data: Record<string, string | null> = {};

  for (const field of fields) {
    const val = (raw[field.key] ?? "").trim();

    if (field.required && !val) {
      errors.push({ field: field.key, message: `${field.label} is required` });
    } else if (val) {
      if (field.maxLength && val.length > field.maxLength) {
        errors.push({ field: field.key, message: `${field.label} exceeds ${field.maxLength} characters` });
      }
      if (field.format === "email" && !EMAIL_RE.test(val)) {
        errors.push({ field: field.key, message: `Invalid email: "${val}"` });
      }
    }

    data[field.key] = val || null;
  }

  return { valid: errors.length === 0, data, errors };
}

/** Pulls the per-field string cells out of a raw row given the active mapping. */
export function applyMapping(
  row: string[],
  mapping: ColumnMapping,
  fields: ImportField[] = CUSTOMER_IMPORT_FIELDS
): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const field of fields) {
    const idx = mapping[field.key];
    if (idx !== null && idx !== undefined) {
      out[field.key] = row[idx] ?? "";
    }
  }
  return out;
}
