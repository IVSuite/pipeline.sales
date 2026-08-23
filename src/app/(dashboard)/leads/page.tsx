"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Trash2, Pencil, SlidersHorizontal, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/modal";
import { LeadForm } from "@/components/leads/lead-form";
import { ImportDialog } from "@/components/import/import-dialog";
import { LEAD_IMPORT_CONFIG } from "@/lib/import/customer-import";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useProfiles } from "@/hooks/use-profiles";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LEAD_STATUSES, PRIORITY_LEVELS } from "@/types/database";
import type { LeadWithRelations } from "@/types/api";
import type { LeadInput } from "@/lib/validation/schemas";

export default function LeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<LeadWithRelations | undefined>();
  const [deleting, setDeleting] = useState<LeadWithRelations | undefined>();

  const { data: profilesData } = useProfiles();
  const { data, isLoading } = useResourceList<LeadWithRelations>("leads", {
    search: debouncedSearch,
    page,
    sortBy,
    sortOrder,
    status,
    priority,
    assigned_to: assignedTo,
    min_value: minValue,
    max_value: maxValue,
  });
  const { create, update, remove } = useResourceMutations("leads");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns mix value types (string, number, joined objects)
  const columns = useMemo<ColumnDef<LeadWithRelations, any>[]>(
    () => [
      { accessorKey: "full_name", header: "Name", meta: { sortKey: "full_name" } },
      { id: "company", header: "Company", cell: ({ row }) => row.original.company?.name ?? "—" },
      {
        accessorKey: "phone",
        header: "Phone Number",
        cell: ({ getValue }) => (getValue() as string) || "—",
      },
      {
        id: "assignee",
        header: "Assigned to",
        cell: ({ row }) => row.original.assignee?.full_name ?? "—",
      },
      {
        id: "deal_count",
        header: "Deal Count",
        cell: ({ row }) => row.original.deals_count ?? 0,
      },
      {
        id: "deal_value_sum",
        header: "Deal Value",
        cell: ({ row }) => formatCurrency(Number(row.original.deals_total_value ?? 0)),
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { sortKey: "status" },
        cell: ({ getValue }) => <Badge tone={statusTone(String(getValue()))}>{String(getValue())}</Badge>,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        meta: { sortKey: "priority" },
        cell: ({ getValue }) => <Badge tone={priorityTone(String(getValue()))}>{String(getValue())}</Badge>,
      },
      {
        accessorKey: "created_at",
        header: "Created",
        meta: { sortKey: "created_at" },
        cell: ({ getValue }) => formatDate(String(getValue())),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditing(row.original);
                setFormOpen(true);
              }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleting(row.original)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  function handleSortChange(key: string) {
    if (key === sortBy) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortOrder("asc");
    }
  }

  function handleSubmit(values: LeadInput) {
    if (editing) {
      update.mutate({ id: editing.id, body: values }, { onSuccess: () => setFormOpen(false) });
    } else {
      create.mutate(values, { onSuccess: () => setFormOpen(false) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">Track and qualify incoming leads.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import data
          </Button>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New lead
          </Button>
        </div>
      </div>

      <Card>
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search leads…"
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
                <option value="">All priorities</option>
                {PRIORITY_LEVELS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
              <Select value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }}>
                <option value="">All salespeople</option>
                {profilesData?.data.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </Select>
              <Input
                type="number"
                placeholder="Min value"
                value={minValue}
                onChange={(e) => { setMinValue(e.target.value); setPage(1); }}
              />
              <Input
                type="number"
                placeholder="Max value"
                value={maxValue}
                onChange={(e) => { setMaxValue(e.target.value); setPage(1); }}
              />
            </div>
          )}
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          emptyMessage="No leads yet. Create your first one."
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onRowClick={(row) => router.push(`/leads/${row.id}`)}
        />
        {data && (
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        )}
      </Card>

      <LeadForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        lead={editing}
        submitting={create.isPending || update.isPending}
      />

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} config={LEAD_IMPORT_CONFIG} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) });
        }}
        title="Delete lead"
        description={`Are you sure you want to delete "${deleting?.full_name}"? This cannot be undone.`}
        loading={remove.isPending}
      />
    </div>
  );
}
