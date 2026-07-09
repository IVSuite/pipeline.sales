import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole, errorResponse } from "@/lib/rbac";
import { zodErrorResponse } from "@/lib/api-utils";
import { profileUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/profiles/[id]">) {
  try {
    const { id } = await ctx.params;
    const { profile, supabase } = await requireUser();
    requireRole(profile, ["admin"]);

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", id)
      .select("id, full_name, email, role")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
