"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, FolderKanban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface LifecycleChain {
  quotation: { id: string; name: string; total: number; quote_number: string | null } | null;
  deals: { id: string; title: string; stage: string }[];
  project: { id: string; code: string; name: string; status: string } | null;
}

const PROJECT_STATUS: Record<string, string> = {
  draft: "Draft",
  planning: "Planning",
  in_production: "In production",
  installation: "Installation",
  completed: "Completed",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

/**
 * Quotation -> this deal -> project. The deal is the middle of one continuous
 * record: it was submitted from a Quotation Builder quotation (or entered here
 * by hand), and Closed Won turns it into a Projects project automatically.
 */
export function DealLifecycle({ dealId, stage }: { dealId: string; stage: string }) {
  const { data, isError } = useQuery<LifecycleChain>({
    queryKey: ["deals", "lifecycle", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/lifecycle`);
      if (!res.ok) throw new Error("lifecycle unavailable");
      return res.json();
    },
  });

  // Informational only: if the chain cannot be read, the deal page is unaffected.
  if (isError || !data) return null;

  const { quotation, project } = data;
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Row
          icon={FileText}
          label="From quotation"
          value={
            quotation
              ? `${quotation.name}${quotation.quote_number ? ` · ${quotation.quote_number}` : ""} · ${formatCurrency(
                  quotation.total
                )}`
              : "Entered in the Pipeline (no quotation)"
          }
        />
        <Row
          icon={FolderKanban}
          label="Project"
          value={
            project
              ? `${project.code} · ${project.name} · ${PROJECT_STATUS[project.status] ?? project.status}`
              : stage === "closed_won"
                ? "Won — project not created yet (see the timeline below)"
                : "Created automatically when this deal is Closed Won"
          }
        />
      </CardContent>
    </Card>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
