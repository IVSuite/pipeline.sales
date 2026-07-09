"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Trash2, Pencil, SlidersHorizontal, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/modal";
import { TaskForm } from "@/components/tasks/task-form";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useProfiles } from "@/hooks/use-profiles";
import { formatDateTime } from "@/lib/utils";
import { PRIORITY_LEVELS, TASK_STATUSES } from "@/types/database";
import type { TaskWithRelations } from "@/types/api";
import type { TaskInput } from "@/lib/validation/schemas";

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("due_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWithRelations | undefined>();
  const [deleting, setDeleting] = useState<TaskWithRelations | undefined>();

  const { data: profilesData } = useProfiles();
  const { data, isLoading } = useResourceList<TaskWithRelations>("tasks", {
    search: debouncedSearch,
    page,
    sortBy,
    sortOrder,
    status,
    priority,
    assigned_to: assignedTo,
  });
  const { create, update, remove } = useResourceMutations("tasks");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns mix value types (string, joined objects)
  const columns = useMemo<ColumnDef<TaskWithRelations, any>[]>(
    () => [
      { accessorKey: "title", header: "Title", meta: { sortKey: "title" } },
      {
        accessorKey: "due_date",
        header: "Due",
        meta: { sortKey: "due_date" },
        cell: ({ getValue }) => formatDateTime(getValue() as string),
      },
      {
        id: "assignee",
        header: "Assigned to",
        cell: ({ row }) => row.original.assignee?.full_name ?? "—",
      },
      {
        accessorKey: "priority",
        header: "Priority",
        meta: { sortKey: "priority" },
        cell: ({ getValue }) => <Badge tone={priorityTone(String(getValue()))}>{String(getValue())}</Badge>,
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { sortKey: "status" },
        cell: ({ getValue }) => <Badge tone={statusTone(String(getValue()))}>{String(getValue()).replace("_", " ")}</Badge>,
      },
      {
        id: "reminder",
        header: "Reminder",
        cell: ({ row }) =>
          row.original.reminder_at ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bell className="h-3 w-3" /> {formatDateTime(row.original.reminder_at)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
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

  function handleSubmit(values: TaskInput) {
    if (editing) update.mutate({ id: editing.id, body: values }, { onSuccess: () => setFormOpen(false) });
    else create.mutate(values, { onSuccess: () => setFormOpen(false) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Follow-ups, reminders, and to-dos.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New task
        </Button>
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
                placeholder="Search tasks…"
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </Select>
              <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
                <option value="">All priorities</option>
                {PRIORITY_LEVELS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
              <Select value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }}>
                <option value="">All users</option>
                {profilesData?.data.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          emptyMessage="No tasks yet."
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
        {data && (
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        )}
      </Card>

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        task={editing}
        submitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) });
        }}
        title="Delete task"
        description={`Are you sure you want to delete "${deleting?.title}"? This cannot be undone.`}
        loading={remove.isPending}
      />
    </div>
  );
}
