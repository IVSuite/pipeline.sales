"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Building2, DollarSign, CalendarClock, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/modal";
import { useResourceMutations } from "@/hooks/use-resource";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import type { DealWithRelations } from "@/types/api";

export function DealCard({ deal }: { deal: DealWithRelations }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { remove } = useResourceMutations("deals", ["leads"]);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={() => !isDragging && router.push(`/deals/${deal.id}`)}
        className={`group relative cursor-grab space-y-2 rounded-lg border border-border bg-surface p-3 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        <button
          aria-label="Delete deal"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteOpen(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 group-hover:block dark:hover:bg-red-950"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <p className="pr-6 font-medium leading-snug">{deal.title}</p>
        {deal.company && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" /> {deal.company.name}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <DollarSign className="h-3 w-3" /> {formatCurrency(deal.value)}
        </p>
        {deal.expected_close_date && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3 w-3" /> {formatDate(deal.expected_close_date)}
          </p>
        )}
        {deal.owner && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
              {initials(deal.owner.full_name)}
            </span>
            <span className="text-xs text-muted-foreground">{deal.owner.full_name}</span>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete deal"
        description={`Are you sure you want to delete "${deal.title}"? This cannot be undone.`}
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(deal.id, { onSuccess: () => setDeleteOpen(false) })
        }
      />
    </>
  );
}
