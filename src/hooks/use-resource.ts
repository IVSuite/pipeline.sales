"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ListResponse<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Request failed");
  }
  return json;
}

export function useResourceList<T>(
  resource: string,
  params: Record<string, string | number | undefined> = {}
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") query.set(k, String(v));
  });
  const qs = query.toString();

  return useQuery<ListResponse<T>>({
    queryKey: [resource, "list", qs],
    queryFn: () => fetchJson(`/api/${resource}${qs ? `?${qs}` : ""}`),
  });
}

export function useResourceOne<T>(resource: string, id: string | undefined) {
  return useQuery<T>({
    queryKey: [resource, "one", id],
    queryFn: () => fetchJson(`/api/${resource}/${id}`),
    enabled: Boolean(id),
  });
}

export function useResourceMutations(resource: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [resource] });

  const create = useMutation({
    mutationFn: (body: unknown) =>
      fetchJson(`/api/${resource}`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate();
      toast.success("Created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      fetchJson(`/api/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate();
      toast.success("Updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove, invalidate };
}
