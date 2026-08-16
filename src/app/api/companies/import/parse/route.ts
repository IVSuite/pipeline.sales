import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse, ApiError } from "@/lib/rbac";
import { handleParseUpload } from "@/lib/import/parse-upload";
import { COMPANY_IMPORT_FIELDS } from "@/lib/import/customer-import";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const payload = await handleParseUpload(request, COMPANY_IMPORT_FIELDS);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
