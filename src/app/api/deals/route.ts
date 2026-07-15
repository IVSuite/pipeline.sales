import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { parseListParams, paginatedResponse, zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { dealSchema } from "@/lib/validation/schemas";

const SELECT =
  "*, company:companies(id, name), owner:profiles!owner_id(id, full_name), lead:leads(id, full_name), customer:customers(id, full_name)";
const SORTABLE = new Set(["title", "value", "stage", "created_at", "updated_at", "expected_close_date"]);

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const sp = request.nextUrl.searchParams;
    const params = parseListParams(sp, "created_at");
    const sortBy = SORTABLE.has(params.sortBy) ? params.sortBy : "created_at";

    let query = supabase.from("deals").select(SELECT, { count: "exact" });

    if (params.search) {
      query = query.ilike("title", `%${params.search}%`);
    }
    const stage = sp.get("stage");
    if (stage) query = query.eq("stage", stage);
    const ownerId = sp.get("owner_id");
    if (ownerId) query = query.eq("owner_id", ownerId);
    const minValue = sp.get("min_value");
    if (minValue) query = query.gte("value", Number(minValue));
    const maxValue = sp.get("max_value");
    if (maxValue) query = query.lte("value", Number(maxValue));

    // The Kanban board wants every deal at once (no pagination) — pass pageSize=all.
    if (sp.get("pageSize") === "all") {
      query = query.order(sortBy, { ascending: params.sortOrder === "asc" });
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data, pagination: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } });
    }

    query = query.order(sortBy, { ascending: params.sortOrder === "asc" }).range(params.from, params.to);

    const { data, error, count } = await query;
    if (error) throw error;

    return paginatedResponse(data, count, params);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await requireUser();
    const body = await request.json();
    const parsed = dealSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("deals")
      .insert({
        ...nullifyEmptyKeys(parsed.data, ["lead_id", "customer_id", "company_id"]),
        value: parsed.data.value ?? 0,
        stage: parsed.data.stage ?? "new_lead",
        expected_close_date: parsed.data.expected_close_date || null,
        owner_id: parsed.data.owner_id || profile.id,
        created_by: profile.id,
      })
      .select(SELECT)
      .single();

    if (error) throw error;

    await supabase.from("activities").insert({
      entity_type: "deal",
      entity_id: data.id,
      type: "status_change",
      body: `Deal created in stage "${data.stage}".`,
      created_by: profile.id,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
