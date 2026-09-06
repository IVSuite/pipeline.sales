import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse, ApiError } from "@/lib/rbac";
import { runImport, type EntityImportSpec } from "@/lib/import/import-runner";
import { LEAD_IMPORT_FIELDS } from "@/lib/import/customer-import";
import { withCors, preflight } from "@/lib/cors";

export const runtime = "nodejs";

const MAX_BATCH = 1000;

// Leads = Customers fields + LinkedIn. Dedupe by email (same as Customers).
// New leads get the same defaults as a single lead created via the form.
const LEAD_SPEC: EntityImportSpec = {
  table: "leads",
  fields: LEAD_IMPORT_FIELDS,
  dedupeField: "email",
  dedupeColumn: "email",
  resolveCompany: true,
  buildInsert: (d, { companyId, profileId }) => ({
    full_name: d.full_name,
    email: d.email,
    phone: d.phone,
    company_id: companyId,
    linkedin: d.linkedin,
    assigned_to: profileId,
    created_by: profileId,
    status: "new",
    priority: "medium",
    deal_value: 0,
  }),
  buildUpdate: (d, { companyId }) => {
    const patch: Record<string, unknown> = { full_name: d.full_name };
    if (d.phone) patch.phone = d.phone;
    if (companyId) patch.company_id = companyId;
    if (d.linkedin) patch.linkedin = d.linkedin;
    return patch;
  },
};

// This route (with its /parse and /template siblings) is also the Marketing
// module's importer: Marketing calls it cross-origin with a bearer token rather
// than carrying a second copy of the import logic. Same validation, same
// duplicate rules, same shared crm.leads rows.
export const OPTIONS = preflight;

export const POST = withCors(async (request: NextRequest) => {
  try {
    const { profile, supabase } = await requireUser();
    const body = await request.json();

    const rows: Record<string, string>[] = Array.isArray(body?.rows) ? body.rows : [];
    const duplicateMode: "skip" | "update" = body?.duplicateMode === "update" ? "update" : "skip";

    if (rows.length === 0) throw new ApiError("No rows provided", 400);
    if (rows.length > MAX_BATCH) throw new ApiError(`Batch too large (max ${MAX_BATCH})`, 400);

    const result = await runImport(supabase, profile.id, rows, LEAD_SPEC, duplicateMode);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
});
