"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerForm } from "./customer-form";
import { EntityTimeline } from "@/components/shared/entity-timeline";
import { useResourceOne, useResourceMutations } from "@/hooks/use-resource";
import { formatDate } from "@/lib/utils";
import type { CustomerWithRelations } from "@/types/api";
import type { CustomerInput } from "@/lib/validation/schemas";

export function CustomerDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const { data: customer, isLoading } = useResourceOne<CustomerWithRelations>("customers", id);
  const { update } = useResourceMutations("customers");

  if (isLoading || !customer) {
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
        onClick={() => router.push("/customers")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{customer.full_name}</h1>
          <p className="text-sm text-muted-foreground">Customer since {formatDate(customer.created_at)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={Mail} label="Email" value={customer.email} />
          <InfoRow icon={Phone} label="Phone" value={customer.phone} />
          <InfoRow icon={Building2} label="Company" value={customer.company?.name} />
          <InfoRow icon={Pencil} label="Assigned to" value={customer.assignee?.full_name} />
        </CardContent>
      </Card>

      <EntityTimeline entityType="customer" entityId={customer.id} />

      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={customer}
        submitting={update.isPending}
        onSubmit={(values: CustomerInput) =>
          update.mutate({ id: customer.id, body: values }, { onSuccess: () => setFormOpen(false) })
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
