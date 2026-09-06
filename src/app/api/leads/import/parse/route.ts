import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse, ApiError } from "@/lib/rbac";
import { handleParseUpload } from "@/lib/import/parse-upload";
import { LEAD_IMPORT_FIELDS, LEAD_IMPORT_CONFIG } from "@/lib/import/customer-import";
import { withCors, preflight } from "@/lib/cors";

export const runtime = "nodejs";

export const OPTIONS = preflight;

export const POST = withCors(async (request: NextRequest) => {
  try {
    await requireUser();
    const payload = await handleParseUpload(request, LEAD_IMPORT_FIELDS);
    // The field definitions and duplicate rule ride along so an external
    // caller (the Marketing module) drives its mapping/preview UI from this
    // app's own import schema instead of keeping a copy of it.
    return NextResponse.json({
      ...payload,
      fields: LEAD_IMPORT_FIELDS,
      dedupeField: LEAD_IMPORT_CONFIG.dedupeField,
      dedupeLabel: LEAD_IMPORT_CONFIG.dedupeLabel,
    });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return errorResponse(error);
  }
});
