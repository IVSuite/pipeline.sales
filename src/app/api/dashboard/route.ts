import { NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/rbac";
import { STAGE_WIN_PROBABILITY, type DealStage } from "@/types/database";

export async function GET() {
  try {
    const { supabase } = await requireUser();

    const [
      { count: totalLeads },
      openDealsData,
      { count: wonDeals },
      { count: lostDeals },
      wonDealsData,
      recentActivities,
      upcomingTasks,
    ] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("deals").select("value, stage").not("stage", "in", "(closed_won,closed_lost)"),
      supabase.from("deals").select("*", { count: "exact", head: true }).eq("stage", "closed_won"),
      supabase.from("deals").select("*", { count: "exact", head: true }).eq("stage", "closed_lost"),
      supabase.from("deals").select("value, created_at").eq("stage", "closed_won"),
      supabase
        .from("activities")
        .select("*, creator:profiles!created_by(id, full_name)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("tasks")
        .select("*, assignee:profiles!assigned_to(id, full_name)")
        .neq("status", "completed")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(8),
    ]);

    const openDeals = openDealsData.data ?? [];
    const revenue = (wonDealsData.data ?? []).reduce((sum, d) => sum + Number(d.value), 0);
    const weightedValue = openDeals.reduce(
      (sum, d) => sum + Number(d.value) * (STAGE_WIN_PROBABILITY[d.stage as DealStage] ?? 0),
      0
    );

    const monthlySales = buildMonthlySeries(wonDealsData.data ?? []);

    return NextResponse.json({
      totalLeads: totalLeads ?? 0,
      activeDeals: openDeals.length,
      wonDeals: wonDeals ?? 0,
      lostDeals: lostDeals ?? 0,
      weightedValue,
      revenue,
      monthlySales,
      recentActivities: recentActivities.data ?? [],
      upcomingTasks: upcomingTasks.data ?? [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function buildMonthlySeries(deals: { value: number; created_at: string }[]) {
  const months: { key: string; label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      value: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const deal of deals) {
    const d = new Date(deal.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.value += Number(deal.value);
  }
  return months.map(({ label, value }) => ({ label, value }));
}
