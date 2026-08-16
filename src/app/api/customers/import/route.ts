import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse, ApiError } from "@/lib/rbac";
import {
  validateMappedRow,
  normalizeEmail,
  normalizeHeader,
  type FieldKey,
} from "@/lib/import/customer-import";

export const runtime = "nodejs";

/** Max rows accepted in a single batch request. The client sends smaller batches. */
const MAX_BATCH = 1000;

interface IncomingRow {
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

interface ImportError {
  index: number;
  full_name: string;
  email: string;
  message: string;
}

interface BatchResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}

/**
 * Imports one batch of already-mapped customer rows.
 *
 * Safety model:
 *  - Runs as the authenticated user through the RLS-protected client (no admin
 *    key), so every write is attributable and policy-checked.
 *  - Never deletes or hard-overwrites: duplicates (matched by email) are skipped
 *    by default; only `duplicateMode: "update"` touches existing rows, and then
 *    only fills the mapped fields.
 *  - Companies referenced by name are matched case-insensitively and created
 *    only when absent (additive) — existing companies are reused, never edited.
 *
 * Batches are sent sequentially by the client, which also drives the progress
 * bar and aggregates the per-batch counts into the final summary.
 */
export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await requireUser();
    const body = await request.json();

    const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const duplicateMode: "skip" | "update" = body?.duplicateMode === "update" ? "update" : "skip";
    const startIndex: number = Number.isFinite(body?.startIndex) ? Number(body.startIndex) : 0;

    if (rows.length === 0) throw new ApiError("No rows provided", 400);
    if (rows.length > MAX_BATCH) throw new ApiError(`Batch too large (max ${MAX_BATCH})`, 400);

    const result: BatchResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    // --- 1. Validate every row up front -------------------------------------
    const valid: { index: number; data: ReturnType<typeof validateMappedRow>["data"] }[] = [];
    rows.forEach((row, i) => {
      const index = startIndex + i;
      const v = validateMappedRow({
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        company: row.company,
      } as Partial<Record<FieldKey, string>>);
      if (!v.valid) {
        result.failed++;
        result.errors.push({
          index,
          full_name: v.data.full_name ?? "",
          email: v.data.email ?? "",
          message: v.errors.map((e) => e.message).join("; "),
        });
      } else {
        valid.push({ index, data: v.data });
      }
    });

    if (valid.length === 0) return NextResponse.json(result);

    // --- 2. Resolve companies (find-or-create by name, case-insensitive) -----
    const companyIdByName = await resolveCompanies(
      supabase,
      profile.id,
      valid.map((v) => v.data.company).filter((c): c is string => !!c)
    );

    // --- 3. Detect existing customers by email (case-insensitive) ------------
    const emailVariants = new Set<string>();
    for (const v of valid) {
      if (v.data.email) {
        emailVariants.add(v.data.email);
        emailVariants.add(v.data.email.toLowerCase());
      }
    }
    const existingByEmail = new Map<string, string>(); // normalizedEmail -> customer id
    if (emailVariants.size > 0) {
      const { data: existing, error } = await supabase
        .from("customers")
        .select("id,email")
        .in("email", Array.from(emailVariants));
      if (error) throw error;
      for (const c of existing ?? []) {
        const norm = normalizeEmail(c.email);
        if (norm && !existingByEmail.has(norm)) existingByEmail.set(norm, c.id);
      }
    }

    // --- 4. Decide insert / update / skip for each valid row -----------------
    const toInsert: Record<string, unknown>[] = [];
    const seenInBatch = new Set<string>(); // normalized emails already handled this batch

    for (const { index, data } of valid) {
      const normEmail = normalizeEmail(data.email);
      const companyId = data.company ? companyIdByName.get(normalizeHeader(data.company)) ?? null : null;

      // Duplicate against a row already processed earlier in this same batch.
      if (normEmail && seenInBatch.has(normEmail)) {
        result.skipped++;
        continue;
      }

      // Duplicate against an existing DB record.
      if (normEmail && existingByEmail.has(normEmail)) {
        if (duplicateMode === "update") {
          const id = existingByEmail.get(normEmail)!;
          const patch: Record<string, unknown> = { full_name: data.full_name };
          if (data.phone) patch.phone = data.phone;
          if (companyId) patch.company_id = companyId;
          const { error } = await supabase.from("customers").update(patch).eq("id", id);
          if (error) {
            result.failed++;
            result.errors.push({ index, full_name: data.full_name ?? "", email: data.email ?? "", message: error.message });
          } else {
            result.updated++;
          }
        } else {
          result.skipped++;
        }
        if (normEmail) seenInBatch.add(normEmail);
        continue;
      }

      // New record.
      toInsert.push({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        company_id: companyId,
        assigned_to: profile.id,
        created_by: profile.id,
      });
      if (normEmail) seenInBatch.add(normEmail);
    }

    // --- 5. Bulk insert new records -----------------------------------------
    if (toInsert.length > 0) {
      const { data: inserted, error } = await supabase.from("customers").insert(toInsert).select("id");
      if (error) throw error;
      result.imported += inserted?.length ?? toInsert.length;
    }

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Builds a map of normalized company name -> company id, creating any companies
 * that don't yet exist. All existing companies are fetched once (the table is
 * small) so matching is done in memory and no company is ever duplicated or
 * modified.
 */
async function resolveCompanies(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
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

  // The companies table is small in this CRM, so we load it once and match in
  // memory (case-insensitively). The high limit guards against PostgREST's
  // default 1000-row cap silently hiding matches and causing duplicate inserts.
  const { data: existing, error } = await supabase.from("companies").select("id,name").limit(10000);
  if (error) throw error;
  for (const c of existing ?? []) {
    const norm = normalizeHeader(c.name ?? "");
    if (norm && !map.has(norm)) map.set(norm, c.id);
  }

  // Create any companies that weren't found.
  const missing = Array.from(distinct.entries()).filter(([norm]) => !map.has(norm));
  if (missing.length > 0) {
    const { data: created, error: insErr } = await supabase
      .from("companies")
      .insert(missing.map(([, name]) => ({ name, owner_id: ownerId })))
      .select("id,name");
    if (insErr) throw insErr;
    for (const c of created ?? []) {
      const norm = normalizeHeader(c.name ?? "");
      if (norm) map.set(norm, c.id);
    }
  }

  return map;
}
