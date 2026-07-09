import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { leadSchema } from "@/lib/validation/schemas";

const SELECT =
  "*, company:companies(id, name), assignee:profiles!assigned_to(id, full_name)";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("leads").select(SELECT).eq("id", id).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  try {
    const { id } = await ctx.params;
    const { profile, supabase } = await requireUser();
    const body = await request.json();
    const parsed = leadSchema.partial().safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data: existing } = await supabase.from("leads").select("status").eq("id", id).single();

    const { data, error } = await supabase
      .from("leads")
      .update({
        ...nullifyEmptyKeys(parsed.data, ["company_id", "assigned_to"]),
        email: parsed.data.email === "" ? null : parsed.data.email,
      })
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) throw error;

    if (parsed.data.status && existing && parsed.data.status !== existing.status) {
      await supabase.from("activities").insert({
        entity_type: "lead",
        entity_id: id,
        type: "status_change",
        body: `Status changed from "${existing.status}" to "${parsed.data.status}".`,
        created_by: profile.id,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
