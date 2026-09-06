import { requireUser, errorResponse } from "@/lib/rbac";
import { buildTemplateXlsxForFields } from "@/lib/import/parse-spreadsheet";
import { LEAD_IMPORT_FIELDS } from "@/lib/import/customer-import";
import { withCors, preflight } from "@/lib/cors";

export const runtime = "nodejs";

export const OPTIONS = preflight;

/** Returns a ready-to-fill .xlsx template built from the real lead import fields. */
export const GET = withCors(async () => {
  try {
    await requireUser();
    const buffer = await buildTemplateXlsxForFields(LEAD_IMPORT_FIELDS, "Leads");
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="pipeline-leads-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
