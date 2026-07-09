import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { parseListParams, paginatedResponse, zodErrorResponse } from "@/lib/api-utils";
import { companySchema } from "@/lib/validation/schemas";

const SELECT = "*, owner:profiles!owner_id(id, full_name)";
const SORTABLE = new Set(["name", "industry", "created_at", "updated_at"]);

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const params = parseListParams(request.nextUrl.searchParams, "created_at");
    const sortBy = SORTABLE.has(params.sortBy) ? params.sortBy : "created_at";

    let query = supabase.from("companies").select(SELECT, { count: "exact" });

    if (params.search) {
      query = query.ilike("name", `%${params.search}%`);
    }
    const ownerId = request.nextUrl.searchParams.get("owner_id");
    if (ownerId) query = query.eq("owner_id", ownerId);

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
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("companies")
      .insert({
        ...parsed.data,
        owner_id: parsed.data.owner_id || profile.id,
      })
      .select(SELECT)
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
