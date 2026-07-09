import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { zodErrorResponse } from "@/lib/api-utils";
import { noteSchema } from "@/lib/validation/schemas";

const SELECT = "*, author:profiles!author_id(id, full_name)";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const sp = request.nextUrl.searchParams;
    const entityType = sp.get("entity_type");
    const entityId = sp.get("entity_id");
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entity_type and entity_id are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notes")
      .select(SELECT)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

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
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("notes")
      .insert({ ...parsed.data, author_id: profile.id })
      .select(SELECT)
      .single();

    if (error) throw error;

    await supabase.from("activities").insert({
      entity_type: parsed.data.entity_type,
      entity_id: parsed.data.entity_id,
      type: "note",
      body: parsed.data.body,
      created_by: profile.id,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
