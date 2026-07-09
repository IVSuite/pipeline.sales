import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/notes/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
