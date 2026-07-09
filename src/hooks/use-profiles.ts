"use client";

import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@/types/database";

export function useProfiles() {
  return useQuery<{ data: Pick<Profile, "id" | "full_name" | "email" | "role">[] }>({
    queryKey: ["profiles"],
    queryFn: () => fetch("/api/profiles").then((r) => r.json()),
    staleTime: 60_000,
  });
}
