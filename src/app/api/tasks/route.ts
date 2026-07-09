import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { parseListParams, paginatedResponse, zodErrorResponse, nullifyEmptyKeys } from "@/lib/api-utils";
import { taskSchema } from "@/lib/validation/schemas";

const SELECT = "*, assignee:profiles!assigned_to(id, full_name)";
const SORTABLE = new Set(["title", "due_date", "priority", "status", "created_at"]);

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const sp = request.nextUrl.searchParams;
    const params = parseListParams(sp, "due_date");
    const sortBy = SORTABLE.has(params.sortBy) ? params.sortBy : "due_date";

    let query = supabase.from("tasks").select(SELECT, { count: "exact" });

    if (params.search) query = query.ilike("title", `%${params.search}%`);
    const status = sp.get("status");
    if (status) query = query.eq("status", status);
    const priority = sp.get("priority");
    if (priority) query = query.eq("priority", priority);
    const assignedTo = sp.get("assigned_to");
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    const dateFrom = sp.get("date_from");
    if (dateFrom) query = query.gte("due_date", dateFrom);
    const dateTo = sp.get("date_to");
    if (dateTo) query = query.lte("due_date", dateTo);

    query = query
      .order(sortBy, { ascending: params.sortOrder === "asc", nullsFirst: false })
      .range(params.from, params.to);

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
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        ...nullifyEmptyKeys(parsed.data, ["related_lead_id", "related_deal_id"]),
        due_date: parsed.data.due_date || null,
        reminder_at: parsed.data.reminder_at || null,
        assigned_to: parsed.data.assigned_to || profile.id,
        created_by: profile.id,
      })
      .select(SELECT)
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
