"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useProfiles } from "@/hooks/use-profiles";
import { USER_ROLES } from "@/types/database";
import { initials } from "@/lib/utils";

export default function SettingsPage() {
  const currentUser = useCurrentUser();
  const { data } = useProfiles();
  const queryClient = useQueryClient();

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      fetch(`/api/profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Failed to update role");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (currentUser.role !== "admin") {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to this page.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Team & Roles</h1>
        <p className="text-sm text-muted-foreground">Manage what each teammate can access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.data.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials(p.full_name)}
                </div>
                <div>
                  <p className="text-sm font-medium">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
              </div>
              <Select
                className="w-40"
                value={p.role}
                disabled={p.id === currentUser.id}
                onChange={(e) => updateRole.mutate({ id: p.id, role: e.target.value })}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
