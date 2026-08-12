"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Trash2, Pencil, SlidersHorizontal, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/modal";
import { CustomerForm } from "@/components/customers/customer-form";
import { ImportCustomersDialog } from "@/components/customers/import-customers-dialog";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useProfiles } from "@/hooks/use-profiles";
import { formatDate } from "@/lib/utils";
import type { CustomerWithRelations } from "@/types/api";
import type { CustomerInput } from "@/lib/validation/schemas";

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerWithRelations | undefined>();
  const [deleting, setDeleting] = useState<CustomerWithRelations | undefined>();

  const { data: profilesData } = useProfiles();
  const { data, isLoading } = useResourceList<CustomerWithRelations>("customers", {
    search: debouncedSearch,
    page,
    sortBy,
    sortOrder,
    assigned_to: assignedTo,
  });
  const { create, update, remove } = useResourceMutations("customers");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns mix value types (string, joined objects)
  const columns = useMemo<ColumnDef<CustomerWithRelations, any>[]>(
    () => [
      { accessorKey: "full_name", header: "Name", meta: { sortKey: "full_name" } },
      { id: "company", header: "Company", cell: ({ row }) => row.original.company?.name ?? "—" },
      { accessorKey: "email", header: "Email", cell: (c) => c.getValue() || "—" },
      { accessorKey: "phone", header: "Phone", cell: (c) => c.getValue() || "—" },
      {
        id: "assignee",
        header: "Assigned to",
        cell: ({ row }) => row.original.assignee?.full_name ?? "—",
      },
      {
        accessorKey: "created_at",
        header: "Customer since",
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

  function handleSubmit(values: CustomerInput) {
    if (editing) update.mutate({ id: editing.id, body: values }, { onSuccess: () => setFormOpen(false) });
    else create.mutate(values, { onSuccess: () => setFormOpen(false) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">Accounts that have converted from leads.</p>
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
            <Plus className="h-4 w-4" /> New customer
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
                placeholder="Search customers…"
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Select value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }}>
                <option value="">All salespeople</option>
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
          emptyMessage="No customers yet."
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onRowClick={(row) => router.push(`/customers/${row.id}`)}
        />
        {data && (
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        )}
      </Card>

      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        customer={editing}
        submitting={create.isPending || update.isPending}
      />

      <ImportCustomersDialog open={importOpen} onClose={() => setImportOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) });
        }}
        title="Delete customer"
        description={`Are you sure you want to delete "${deleting?.full_name}"? This cannot be undone.`}
        loading={remove.isPending}
      />
    </div>
  );
}
