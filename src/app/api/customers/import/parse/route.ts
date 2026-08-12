import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse, ApiError } from "@/lib/rbac";
import { parseSpreadsheet } from "@/lib/import/parse-spreadsheet";
import { suggestMapping } from "@/lib/import/customer-import";

// exceljs relies on Node APIs (Buffer, streams) — force the Node runtime.
export const runtime = "nodejs";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Accepts a multipart upload (field name `file`), parses the first sheet, and
 * returns headers, rows, and a suggested column mapping. Read-only: nothing is
 * written to the database here — this only powers the mapping/preview steps.
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      throw new ApiError("No file uploaded", 400);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ApiError("File is too large (max 15 MB)", 400);
    }

    const buffer = await file.arrayBuffer();
    const parsed = await parseSpreadsheet(file.name, buffer);

    if (parsed.headers.length === 0) {
      throw new ApiError("Could not find a header row in the file", 400);
    }

    return NextResponse.json({
      fileName: file.name,
      headers: parsed.headers,
      rows: parsed.rows,
      totalRows: parsed.totalRows,
      truncated: parsed.truncated,
      suggestedMapping: suggestMapping(parsed.headers),
    });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      // Surface parser messages (e.g. unsupported type) as a 400 rather than 500.
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
