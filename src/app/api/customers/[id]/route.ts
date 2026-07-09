import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { customerSchema } from "@/lib/validation/schemas";

const SELECT =
  "*, company:companies(id, name), assignee:profiles!assigned_to(id, full_name)";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("customers").select(SELECT).eq("id", id).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  try {
    const { id } = await ctx.params;
    const { profile, supabase } = await requireUser();
    const body = await request.json();
    const parsed = customerSchema.partial().safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("customers")
      .update({
        ...nullifyEmptyKeys(parsed.data, ["company_id", "assigned_to"]),
        email: parsed.data.email === "" ? null : parsed.data.email,
      })
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) throw error;

    await supabase.from("activities").insert({
      entity_type: "customer",
      entity_id: id,
      type: "status_change",
      body: "Customer information updated.",
      created_by: profile.id,
    });

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
