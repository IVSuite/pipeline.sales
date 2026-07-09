"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn, formatCurrency } from "@/lib/utils";
import { DealCard } from "./deal-card";
import type { DealWithRelations } from "@/types/api";
import type { DealStage } from "@/types/database";

export function KanbanColumn({
  stage,
  label,
  deals,
}: {
  stage: DealStage;
  label: string;
  deals: DealWithRelations[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{deals.length}</span>
      </div>
      <p className="mb-2 px-1 text-xs text-muted-foreground">{formatCurrency(total)}</p>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 rounded-xl border border-dashed border-border bg-surface-muted/50 p-2 transition-colors",
          isOver && "border-primary bg-primary/5"
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
        {deals.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8 text-xs text-muted-foreground">
            Drop deals here
          </div>
        )}
      </div>
    </div>
  );
}
