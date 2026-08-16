import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse, ApiError } from "@/lib/rbac";
import { runImport, type EntityImportSpec } from "@/lib/import/import-runner";
import { COMPANY_IMPORT_FIELDS } from "@/lib/import/customer-import";

export const runtime = "nodejs";

const MAX_BATCH = 1000;

// Companies are the entity itself: name (dedupe key) + phone + address.
// No company resolution, no full_name/email (those columns don't exist).
const COMPANY_SPEC: EntityImportSpec = {
  table: "companies",
  fields: COMPANY_IMPORT_FIELDS,
  dedupeField: "name",
  dedupeColumn: "name",
  resolveCompany: false,
  buildInsert: (d, { profileId }) => ({
    name: d.name,
    phone: d.phone,
    address: d.address,
    owner_id: profileId,
  }),
  buildUpdate: (d) => {
    // `name` is the dedupe key (unchanged); enrich phone/address in update mode.
    const patch: Record<string, unknown> = { name: d.name };
    if (d.phone) patch.phone = d.phone;
    if (d.address) patch.address = d.address;
    return patch;
  },
};

export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await requireUser();
    const body = await request.json();

    const rows: Record<string, string>[] = Array.isArray(body?.rows) ? body.rows : [];
    const duplicateMode: "skip" | "update" = body?.duplicateMode === "update" ? "update" : "skip";

    if (rows.length === 0) throw new ApiError("No rows provided", 400);
    if (rows.length > MAX_BATCH) throw new ApiError(`Batch too large (max ${MAX_BATCH})`, 400);

    const result = await runImport(supabase, profile.id, rows, COMPANY_SPEC, duplicateMode);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
