"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "./kanban-column";
import { DealCard } from "./deal-card";
import { DealForm } from "@/components/deals/deal-form";
import { useResourceList, useResourceMutations, type ListResponse } from "@/hooks/use-resource";
import { DEAL_STAGES } from "@/types/database";
import type { DealWithRelations } from "@/types/api";
import type { DealInput } from "@/lib/validation/schemas";

export function DealBoard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useResourceList<DealWithRelations>("deals", { pageSize: "all" });
  const { create } = useResourceMutations("deals");
  const [activeDeal, setActiveDeal] = useState<DealWithRelations | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState<string | undefined>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const deals = data?.data ?? [];
  const dealsByStage = Object.fromEntries(
    DEAL_STAGES.map((s) => [s.value, deals.filter((d) => d.stage === s.value)])
  ) as Record<string, DealWithRelations[]>;

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const newStage = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    const queryKeys = queryClient
      .getQueryCache()
      .findAll({ queryKey: ["deals", "list"] })
      .map((q) => q.queryKey);

    const previous = queryKeys.map((key) => [key, queryClient.getQueryData(key)] as const);

    queryKeys.forEach((key) => {
      queryClient.setQueryData<ListResponse<DealWithRelations>>(key, (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map((d) => (d.id === dealId ? { ...d, stage: newStage as DealWithRelations["stage"] } : d)) };
      });
    });

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
      toast.success(`Moved to ${DEAL_STAGES.find((s) => s.value === newStage)?.label}`);
    } catch {
      previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error("Failed to move deal — reverted");
    } finally {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    }
  }

  function handleCreate(values: DealInput) {
    create.mutate(values, { onSuccess: () => setFormOpen(false) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">Drag deals between stages to update them instantly.</p>
        </div>
        <Button
          onClick={() => {
            setDefaultStage(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New deal
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading pipeline…</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {DEAL_STAGES.map((s) => (
              <KanbanColumn key={s.value} stage={s.value} label={s.label} deals={dealsByStage[s.value] ?? []} />
            ))}
          </div>
          <DragOverlay>{activeDeal && <DealCard deal={activeDeal} />}</DragOverlay>
        </DndContext>
      )}

      <DealForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        defaultStage={defaultStage}
        submitting={create.isPending}
      />
    </div>
  );
}
