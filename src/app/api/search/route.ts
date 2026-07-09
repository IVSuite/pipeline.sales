import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const like = `%${q}%`;

    const [leads, customers, companies, deals] = await Promise.all([
      supabase.from("leads").select("id, full_name, email").ilike("full_name", like).limit(5),
      supabase.from("customers").select("id, full_name, email").ilike("full_name", like).limit(5),
      supabase.from("companies").select("id, name, industry").ilike("name", like).limit(5),
      supabase.from("deals").select("id, title, stage").ilike("title", like).limit(5),
    ]);

    const results = [
      ...(leads.data ?? []).map((l) => ({ id: l.id, label: l.full_name, sublabel: l.email, type: "lead" as const })),
      ...(customers.data ?? []).map((c) => ({
        id: c.id,
        label: c.full_name,
        sublabel: c.email,
        type: "customer" as const,
      })),
      ...(companies.data ?? []).map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.industry,
        type: "company" as const,
      })),
      ...(deals.data ?? []).map((d) => ({
        id: d.id,
        label: d.title,
        sublabel: d.stage.replace("_", " "),
        type: "deal" as const,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    return errorResponse(error);
  }
}
