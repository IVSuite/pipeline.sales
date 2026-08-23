import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { parseListParams, paginatedResponse, zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { leadSchema } from "@/lib/validation/schemas";
import { aggregateDealStatsByLead, type DealStatRow } from "@/lib/deal-stats";

const SELECT =
  "*, company:companies(id, name), assignee:profiles!assigned_to(id, full_name)";
const SORTABLE = new Set(["full_name", "deal_value", "created_at", "updated_at", "status", "priority"]);

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const sp = request.nextUrl.searchParams;
    const params = parseListParams(sp, "created_at");
    const sortBy = SORTABLE.has(params.sortBy) ? params.sortBy : "created_at";

    let query = supabase.from("leads").select(SELECT, { count: "exact" });

    if (params.search) {
      query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }
    const status = sp.get("status");
    if (status) query = query.eq("status", status);
    const priority = sp.get("priority");
    if (priority) query = query.eq("priority", priority);
    const assignedTo = sp.get("assigned_to");
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    const minValue = sp.get("min_value");
    if (minValue) query = query.gte("deal_value", Number(minValue));
    const maxValue = sp.get("max_value");
    if (maxValue) query = query.lte("deal_value", Number(maxValue));
    const dateFrom = sp.get("date_from");
    if (dateFrom) query = query.gte("created_at", dateFrom);
    const dateTo = sp.get("date_to");
    if (dateTo) query = query.lte("created_at", dateTo);

    query = query.order(sortBy, { ascending: params.sortOrder === "asc" }).range(params.from, params.to);

    const { data, error, count } = await query;
    if (error) throw error;

    // Per-lead deal stats, computed on read from deals.lead_id (never stored on
    // leads). Only the deals linked to the current page of leads are fetched.
    const leadIds = (data ?? []).map((l) => l.id);
    let statsByLead = new Map<string, { count: number; total: number }>();
    if (leadIds.length > 0) {
      const { data: dealRows, error: dealsError } = await supabase
        .from("deals")
        .select("lead_id, value")
        .in("lead_id", leadIds);
      if (dealsError) throw dealsError;
      statsByLead = aggregateDealStatsByLead((dealRows ?? []) as DealStatRow[]);
    }

    const enriched = (data ?? []).map((lead) => {
      const stat = statsByLead.get(lead.id);
      return { ...lead, deals_count: stat?.count ?? 0, deals_total_value: stat?.total ?? 0 };
    });

    return paginatedResponse(enriched, count, params);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await requireUser();
    const body = await request.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("leads")
      .insert({
        ...nullifyEmptyKeys(parsed.data, ["company_id"]),
        deal_value: parsed.data.deal_value ?? 0,
        status: parsed.data.status ?? "new",
        priority: parsed.data.priority ?? "medium",
        email: parsed.data.email || null,
        assigned_to: parsed.data.assigned_to || profile.id,
        created_by: profile.id,
      })
      .select(SELECT)
      .single();

    if (error) throw error;

    await supabase.from("activities").insert({
      entity_type: "lead",
      entity_id: data.id,
      type: "status_change",
      body: `Lead created with status "${data.status}".`,
      created_by: profile.id,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
