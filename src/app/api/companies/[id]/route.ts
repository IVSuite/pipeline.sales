import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { companySchema } from "@/lib/validation/schemas";

const SELECT = "*, owner:profiles!owner_id(id, full_name)";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/companies/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("companies").select(SELECT).eq("id", id).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/companies/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const body = await request.json();
    const parsed = companySchema.partial().safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("companies")
      .update(nullifyEmptyKeys(parsed.data, ["owner_id"]))
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/companies/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
