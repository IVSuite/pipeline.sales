import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { dealSchema } from "@/lib/validation/schemas";
import { DEAL_STAGES } from "@/types/database";

const SELECT =
  "*, company:companies(id, name), owner:profiles!owner_id(id, full_name), lead:leads(id, full_name), customer:customers(id, full_name)";

function stageLabel(stage: string) {
  return DEAL_STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/deals/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("deals").select(SELECT).eq("id", id).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/deals/[id]">) {
  try {
    const { id } = await ctx.params;
    const { profile, supabase } = await requireUser();
    const body = await request.json();
    const parsed = dealSchema.partial().safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data: existing } = await supabase.from("deals").select("stage").eq("id", id).single();

    const { data, error } = await supabase
      .from("deals")
      .update({
        ...nullifyEmptyKeys(parsed.data, ["lead_id", "customer_id", "company_id", "owner_id"]),
        expected_close_date:
          parsed.data.expected_close_date === "" ? null : parsed.data.expected_close_date,
      })
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) throw error;

    if (parsed.data.stage && existing && parsed.data.stage !== existing.stage) {
      await supabase.from("activities").insert({
        entity_type: "deal",
        entity_id: id,
        type: "status_change",
        body: `Stage changed from "${stageLabel(existing.stage)}" to "${stageLabel(parsed.data.stage)}".`,
        created_by: profile.id,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/deals/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
