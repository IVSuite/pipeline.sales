import { requireUser, errorResponse } from "@/lib/rbac";
import { buildTemplateXlsx } from "@/lib/import/parse-spreadsheet";

export const runtime = "nodejs";

/** Returns a ready-to-fill .xlsx template built from the real customer fields. */
export async function GET() {
  try {
    await requireUser();
    const buffer = await buildTemplateXlsx();
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="pipeline-customers-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
