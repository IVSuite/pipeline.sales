import "server-only";

import type { createClient } from "@/lib/supabase/server";
import {
  validateMappedRow,
  normalizeDedupeKey,
  normalizeHeader,
  type ImportField,
} from "./customer-import";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Per-entity spec that drives the shared batch importer. Mirrors the logic in
 * the original Customers import route (validate → resolve companies → dedupe →
 * insert), parameterized so Leads and Companies reuse the exact same flow.
 * The Customers route is intentionally left on its own copy so it is never
 * touched by this shared code.
 */
export interface EntityImportSpec {
  table: "customers" | "leads" | "companies";
  fields: ImportField[];
  /** Validated-data key used to detect duplicates (e.g. "email" or "name"). */
  dedupeField: string;
  /** DB column matched against for duplicate detection. */
  dedupeColumn: string;
  /** Resolve the `company` field to a company_id (find-or-create by name). */
  resolveCompany: boolean;
  /** Builds the row to insert for a new record. */
  buildInsert: (
    data: Record<string, string | null>,
    ctx: { companyId: string | null; profileId: string }
  ) => Record<string, unknown>;
  /** Builds the patch applied to an existing record in `update` mode. */
  buildUpdate: (data: Record<string, string | null>, ctx: { companyId: string | null }) => Record<string, unknown>;
  /** Field key whose value labels a row in error output (defaults to first required field). */
  displayField?: string;
}

export interface ImportError {
  index: number;
  name: string;
  key: string;
  message: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}

/**
 * Imports one batch of already-mapped rows for the given entity spec.
 *
 * Safety model (identical to Customers): runs as the authenticated user through
 * the RLS-protected client; duplicates (matched by the spec's dedupe column) are
 * skipped by default and only touched in `update` mode; companies referenced by
 * name are matched case-insensitively and created only when absent.
 */
export async function runImport(
  supabase: ServerSupabase,
  profileId: string,
  rows: Record<string, string>[],
  spec: EntityImportSpec,
  duplicateMode: "skip" | "update"
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  const displayKey = spec.displayField ?? spec.fields.find((f) => f.required)?.key ?? spec.fields[0].key;

  // --- 1. Validate ---------------------------------------------------------
  const valid: { index: number; data: Record<string, string | null> }[] = [];
  rows.forEach((row, i) => {
    const v = validateMappedRow(row, spec.fields);
    if (!v.valid) {
      result.failed++;
      result.errors.push({
        index: i,
        name: v.data[displayKey] ?? "",
        key: v.data[spec.dedupeField] ?? "",
        message: v.errors.map((e) => e.message).join("; "),
      });
    } else {
      valid.push({ index: i, data: v.data });
    }
  });
  if (valid.length === 0) return result;

  // --- 2. Resolve companies (find-or-create by name) -----------------------
  const companyIdByName = spec.resolveCompany
    ? await resolveCompanies(
        supabase,
        profileId,
        valid.map((v) => v.data.company).filter((c): c is string => !!c)
      )
    : new Map<string, string>();

  // --- 3. Existing duplicates (case-insensitive on the dedupe column) ------
  const keyVariants = new Set<string>();
  for (const v of valid) {
    const kv = v.data[spec.dedupeField];
    if (kv) {
      keyVariants.add(kv);
      keyVariants.add(kv.toLowerCase());
    }
  }
  const existingById = new Map<string, string>(); // normalized key -> row id
  if (keyVariants.size > 0) {
    const { data: existing, error } = await supabase
      .from(spec.table)
      .select(`id,${spec.dedupeColumn}`)
      .in(spec.dedupeColumn, Array.from(keyVariants));
    if (error) throw error;
    for (const c of existing ?? []) {
      const row = c as unknown as Record<string, unknown>;
      const nk = normalizeDedupeKey(row[spec.dedupeColumn] as string | null);
      if (nk && !existingById.has(nk)) existingById.set(nk, row.id as string);
    }
  }

  // --- 4. Decide insert / update / skip ------------------------------------
  const toInsert: Record<string, unknown>[] = [];
  const seenInBatch = new Set<string>();

  for (const { index, data } of valid) {
    const nk = normalizeDedupeKey(data[spec.dedupeField]);
    const companyId =
      spec.resolveCompany && data.company ? companyIdByName.get(normalizeHeader(data.company)) ?? null : null;

    if (nk && seenInBatch.has(nk)) {
      result.skipped++;
      continue;
    }

    if (nk && existingById.has(nk)) {
      if (duplicateMode === "update") {
        const id = existingById.get(nk)!;
        const patch = spec.buildUpdate(data, { companyId });
        const { error } = await supabase.from(spec.table).update(patch).eq("id", id);
        if (error) {
          result.failed++;
          result.errors.push({ index, name: data[displayKey] ?? "", key: data[spec.dedupeField] ?? "", message: error.message });
        } else {
          result.updated++;
        }
      } else {
        result.skipped++;
      }
      if (nk) seenInBatch.add(nk);
      continue;
    }

    toInsert.push(spec.buildInsert(data, { companyId, profileId }));
    if (nk) seenInBatch.add(nk);
  }

  // --- 5. Bulk insert ------------------------------------------------------
  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase.from(spec.table).insert(toInsert).select("id");
    if (error) throw error;
    result.imported += inserted?.length ?? toInsert.length;
  }

  return result;
}

/**
 * Builds a map of normalized company name -> company id, creating any companies
 * that don't yet exist. All existing companies are fetched once (the table is
 * small) so matching is done in memory and no company is ever duplicated or
 * modified. (Identical to the Customers route's helper.)
 */
async function resolveCompanies(
  supabase: ServerSupabase,
  ownerId: string,
  names: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const distinct = new Map<string, string>(); // normalized -> original display name
  for (const n of names) {
    const norm = normalizeHeader(n);
    if (norm && !distinct.has(norm)) distinct.set(norm, n.trim());
  }
  if (distinct.size === 0) return map;

  const { data: existing, error } = await supabase.from("companies").select("id,name").limit(10000);
  if (error) throw error;
  for (const c of existing ?? []) {
    const norm = normalizeHeader((c as { name?: string }).name ?? "");
    if (norm && !map.has(norm)) map.set(norm, (c as { id: string }).id);
  }

  const missing = Array.from(distinct.entries()).filter(([norm]) => !map.has(norm));
  if (missing.length > 0) {
    const { data: created, error: insErr } = await supabase
      .from("companies")
      .insert(missing.map(([, name]) => ({ name, owner_id: ownerId })))
      .select("id,name");
    if (insErr) throw insErr;
    for (const c of created ?? []) {
      const norm = normalizeHeader((c as { name?: string }).name ?? "");
      if (norm) map.set(norm, (c as { id: string }).id);
    }
  }

  return map;
}
