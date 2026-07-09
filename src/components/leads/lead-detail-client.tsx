"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Briefcase, DollarSign, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadForm } from "./lead-form";
import { EntityTimeline } from "@/components/shared/entity-timeline";
import { useResourceOne, useResourceMutations } from "@/hooks/use-resource";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LeadWithRelations } from "@/types/api";
import type { LeadInput } from "@/lib/validation/schemas";

export function LeadDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const { data: lead, isLoading } = useResourceOne<LeadWithRelations>("leads", id);
  const { update } = useResourceMutations("leads");

  if (isLoading || !lead) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => router.push("/leads")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{lead.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {lead.position || "—"} at {lead.company?.name || "no company"}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
            <Badge tone={priorityTone(lead.priority)}>{lead.priority}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={Mail} label="Email" value={lead.email} />
          <InfoRow icon={Phone} label="Phone" value={lead.phone} />
          <InfoRow icon={Briefcase} label="Lead source" value={lead.lead_source} />
          <InfoRow icon={DollarSign} label="Deal value" value={formatCurrency(lead.deal_value)} />
          <InfoRow icon={Pencil} label="Assigned to" value={lead.assignee?.full_name} />
          <InfoRow icon={Pencil} label="Created" value={formatDate(lead.created_at)} />
        </CardContent>
      </Card>

      {lead.notes && (
        <Card>
          <CardContent>
            <p className="mb-1 text-xs text-muted-foreground">Original notes</p>
            <p className="text-sm">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      <EntityTimeline entityType="lead" entityId={lead.id} />

      <LeadForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        lead={lead}
        submitting={update.isPending}
        onSubmit={(values: LeadInput) =>
          update.mutate({ id: lead.id, body: values }, { onSuccess: () => setFormOpen(false) })
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
