import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { taskSchema } from "@/lib/validation/schemas";

const SELECT = "*, assignee:profiles!assigned_to(id, full_name)";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("tasks").select(SELECT).eq("id", id).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const body = await request.json();
    const parsed = taskSchema.partial().safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("tasks")
      .update({
        ...nullifyEmptyKeys(parsed.data, ["assigned_to", "related_lead_id", "related_deal_id"]),
        due_date: parsed.data.due_date === "" ? null : parsed.data.due_date,
        reminder_at: parsed.data.reminder_at === "" ? null : parsed.data.reminder_at,
      })
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
