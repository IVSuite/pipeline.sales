"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, KanbanSquare, Trophy, XCircle, DollarSign } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks";
import { CardSkeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ActivityWithCreator, TaskWithRelations } from "@/types/api";

interface DashboardData {
  totalLeads: number;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  revenue: number;
  monthlySales: { label: string; value: number }[];
  recentActivities: ActivityWithCreator[];
  upcomingTasks: TaskWithRelations[];
}

export default function DashboardPage() {
  const profile = useCurrentUser();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back, {profile.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your pipeline today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Leads" value={String(data.totalLeads)} icon={Users} />
            <StatCard label="Active Deals" value={String(data.activeDeals)} icon={KanbanSquare} />
            <StatCard label="Won Deals" value={String(data.wonDeals)} icon={Trophy} tone="success" />
            <StatCard label="Lost Deals" value={String(data.lostDeals)} icon={XCircle} tone="danger" />
            <StatCard label="Revenue" value={formatCurrency(data.revenue)} icon={DollarSign} tone="success" />
          </>
        )}
      </div>

      {data && (
        <>
          <MonthlySalesChart data={data.monthlySales} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentActivities activities={data.recentActivities} />
            <UpcomingTasks tasks={data.upcomingTasks} />
          </div>
        </>
      )}
    </div>
  );
}
