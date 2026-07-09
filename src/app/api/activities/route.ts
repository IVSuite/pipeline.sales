import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { zodErrorResponse } from "@/lib/api-utils";
import { activitySchema } from "@/lib/validation/schemas";

const SELECT = "*, creator:profiles!created_by(id, full_name)";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const sp = request.nextUrl.searchParams;
    const entityType = sp.get("entity_type");
    const entityId = sp.get("entity_id");
    const limit = Math.min(100, Number(sp.get("limit")) || 20);

    let query = supabase.from("activities").select(SELECT).order("created_at", { ascending: false }).limit(limit);

    if (entityType && entityId) {
      query = query.eq("entity_type", entityType).eq("entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await requireUser();
    const body = await request.json();
    const parsed = activitySchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("activities")
      .insert({ ...parsed.data, created_by: profile.id })
      .select(SELECT)
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
