import "server-only";

import { ApiError } from "@/lib/rbac";
import { parseSpreadsheet } from "./parse-spreadsheet";
import { suggestMapping, type ImportField } from "./customer-import";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Shared handler for the per-entity `import/parse` routes: reads the uploaded file,
 * parses the first sheet, and returns headers + rows + a suggested mapping for
 * the given field set. Read-only — writes nothing to the database.
 */
export async function handleParseUpload(request: Request, fields: ImportField[]) {
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

  return {
    fileName: file.name,
    headers: parsed.headers,
    rows: parsed.rows,
    totalRows: parsed.totalRows,
    truncated: parsed.truncated,
    suggestedMapping: suggestMapping(parsed.headers, fields),
  };
}
