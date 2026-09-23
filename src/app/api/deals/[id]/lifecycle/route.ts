import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";

/**
 * Where this deal came from and what it became: the Quotation Builder quotation
 * it was submitted from, and the Projects project it was realised as when it
 * was Closed Won.
 *
 * Read through `qbuilder.lifecycle_chain()`, a SECURITY DEFINER function that
 * re-checks the caller's IV Suite grant and returns headers only (names, codes,
 * stages). The Pipeline cannot read the Quotation Builder's or Projects' tables
 * directly, and does not need to.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/deals/[id]/lifecycle">) {
  try {
    const { id } = await ctx.params;
    const { supabase } = await requireUser();
    const { data, error } = await supabase.schema("qbuilder").rpc("lifecycle_chain", { p_deal_id: id });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
