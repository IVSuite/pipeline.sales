"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, DollarSign, CalendarClock, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/modal";
import { DealForm } from "./deal-form";
import { EntityTimeline } from "@/components/shared/entity-timeline";
import { useResourceOne, useResourceMutations } from "@/hooks/use-resource";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEAL_STAGES } from "@/types/database";
import type { DealWithRelations } from "@/types/api";
import type { DealInput } from "@/lib/validation/schemas";

export function DealDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: deal, isLoading } = useResourceOne<DealWithRelations>("deals", id);
  const { update, remove } = useResourceMutations("deals", ["leads"]);

  if (isLoading || !deal) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const stageLabel = DEAL_STAGES.find((s) => s.value === deal.stage)?.label ?? deal.stage;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => router.push("/deals")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to pipeline
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{deal.title}</h1>
          <div className="mt-2">
            <Badge tone="info">{stageLabel}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={DollarSign} label="Value" value={formatCurrency(deal.value)} />
          <InfoRow icon={Building2} label="Company" value={deal.company?.name} />
          <InfoRow icon={CalendarClock} label="Expected close" value={formatDate(deal.expected_close_date)} />
          <InfoRow icon={Pencil} label="Owner" value={deal.owner?.full_name} />
          <InfoRow icon={Pencil} label="Linked lead" value={deal.lead?.full_name} />
          <InfoRow icon={Pencil} label="Linked customer" value={deal.customer?.full_name} />
        </CardContent>
      </Card>

      <EntityTimeline entityType="deal" entityId={deal.id} />

      <DealForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        deal={deal}
        submitting={update.isPending}
        onSubmit={(values: DealInput) =>
          update.mutate({ id: deal.id, body: values }, { onSuccess: () => setFormOpen(false) })
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete deal"
        description={`Are you sure you want to delete "${deal.title}"? This cannot be undone.`}
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(deal.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              router.push("/deals");
            },
          })
        }
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
