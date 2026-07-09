"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Phone, MapPin, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyForm } from "./company-form";
import { EntityTimeline } from "@/components/shared/entity-timeline";
import { useResourceOne, useResourceMutations } from "@/hooks/use-resource";
import type { CompanyWithRelations } from "@/types/api";
import type { CompanyInput } from "@/lib/validation/schemas";

export function CompanyDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const { data: company, isLoading } = useResourceOne<CompanyWithRelations>("companies", id);
  const { update } = useResourceMutations("companies");

  if (isLoading || !company) {
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
        onClick={() => router.push("/companies")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to companies
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">{company.industry || "No industry set"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={Globe} label="Website" value={company.website} />
          <InfoRow icon={Phone} label="Phone" value={company.phone} />
          <InfoRow icon={MapPin} label="Address" value={company.address} />
          <InfoRow icon={Pencil} label="Owner" value={company.owner?.full_name} />
        </CardContent>
      </Card>

      <EntityTimeline entityType="company" entityId={company.id} />

      <CompanyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        company={company}
        submitting={update.isPending}
        onSubmit={(values: CompanyInput) =>
          update.mutate({ id: company.id, body: values }, { onSuccess: () => setFormOpen(false) })
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
