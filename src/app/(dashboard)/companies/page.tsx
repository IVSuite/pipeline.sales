"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Trash2, Pencil, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/modal";
import { CompanyForm } from "@/components/companies/company-form";
import { ImportDialog } from "@/components/import/import-dialog";
import { COMPANY_IMPORT_CONFIG } from "@/lib/import/customer-import";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { CompanyWithRelations } from "@/types/api";
import type { CompanyInput } from "@/lib/validation/schemas";

export default function CompaniesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyWithRelations | undefined>();
  const [deleting, setDeleting] = useState<CompanyWithRelations | undefined>();

  const { data, isLoading } = useResourceList<CompanyWithRelations>("companies", {
    search: debouncedSearch,
    page,
    sortBy,
    sortOrder,
  });
  const { create, update, remove } = useResourceMutations("companies");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns mix value types (string, joined objects)
  const columns = useMemo<ColumnDef<CompanyWithRelations, any>[]>(
    () => [
      { accessorKey: "name", header: "Name", meta: { sortKey: "name" } },
      { accessorKey: "industry", header: "Industry", cell: (c) => c.getValue() || "—" },
      {
        id: "owner",
        header: "Owner",
        cell: ({ row }) => row.original.owner?.full_name ?? "—",
      },
      { accessorKey: "phone", header: "Phone", cell: (c) => c.getValue() || "—" },
      { accessorKey: "address", header: "Address", cell: (c) => c.getValue() || "—" },
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
    if (key === sortBy) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  }

  function handleSubmit(values: CompanyInput) {
    if (editing) {
      update.mutate(
        { id: editing.id, body: values },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      create.mutate(values, { onSuccess: () => setFormOpen(false) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground">Accounts your team is working with.</p>
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
            <Plus className="h-4 w-4" /> New company
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search companies…"
              className="pl-9"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          emptyMessage="No companies yet. Create your first one."
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onRowClick={(row) => router.push(`/companies/${row.id}`)}
        />
        {data && (
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        )}
      </Card>

      <CompanyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        company={editing}
        submitting={create.isPending || update.isPending}
      />

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} config={COMPANY_IMPORT_CONFIG} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) });
        }}
        title="Delete company"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        loading={remove.isPending}
      />
    </div>
  );
}
