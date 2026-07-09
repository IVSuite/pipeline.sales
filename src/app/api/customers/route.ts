import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { parseListParams, paginatedResponse, zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { customerSchema } from "@/lib/validation/schemas";

const SELECT =
  "*, company:companies(id, name), assignee:profiles!assigned_to(id, full_name)";
const SORTABLE = new Set(["full_name", "created_at", "updated_at"]);

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const sp = request.nextUrl.searchParams;
    const params = parseListParams(sp, "created_at");
    const sortBy = SORTABLE.has(params.sortBy) ? params.sortBy : "created_at";

    let query = supabase.from("customers").select(SELECT, { count: "exact" });

    if (params.search) {
      query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }
    const assignedTo = sp.get("assigned_to");
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    const companyId = sp.get("company_id");
    if (companyId) query = query.eq("company_id", companyId);

    query = query.order(sortBy, { ascending: params.sortOrder === "asc" }).range(params.from, params.to);

    const { data, error, count } = await query;
    if (error) throw error;

    return paginatedResponse(data, count, params);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await requireUser();
    const body = await request.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("customers")
      .insert({
        ...nullifyEmptyKeys(parsed.data, ["company_id"]),
        email: parsed.data.email || null,
        assigned_to: parsed.data.assigned_to || profile.id,
        created_by: profile.id,
      })
      .select(SELECT)
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
