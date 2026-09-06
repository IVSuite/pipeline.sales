"use client";

/* ---------------------------------------------------------------------------
 * Live refresh from the shared CRM tables.
 *
 * Leads (and the deals / companies their list columns are derived from) are
 * shared with the IV Suite Marketing module: both apps read and write the very
 * same `crm.*` rows. A lead created, edited, imported or deleted in Marketing
 * must therefore show up here without a manual reload.
 *
 * This subscribes to Postgres change events on those tables through Supabase
 * Realtime — the same publication the Marketing module already listens to in
 * the other direction — and invalidates the matching react-query caches, so
 * every mounted list / detail view refetches from the API. Nothing is copied
 * or merged client-side; the API stays the single reader of the shared rows.
 *
 * Realtime honours RLS with the signed-in user's token, so a user only ever
 * receives events for rows they could read anyway.
 * ------------------------------------------------------------------------- */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { DB_SCHEMA } from "@/lib/supabase/config";

/** Table → react-query keys whose data is read from (or derived from) that table. */
const TABLE_KEYS: Record<string, string[]> = {
  leads: ["leads", "dashboard"],
  // Deal Count / Deal Value on the leads list are aggregated from deals.lead_id.
  deals: ["deals", "leads", "dashboard"],
  // The leads list joins company names.
  companies: ["companies", "leads"],
  tasks: ["tasks", "dashboard"],
};

/** A bulk import fires one event per inserted row; coalesce bursts into one refetch. */
const DEBOUNCE_MS = 300;

export function RealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const invalidateLater = (key: string) => {
      const pending = timers.get(key);
      if (pending) clearTimeout(pending);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          queryClient.invalidateQueries({ queryKey: [key] });
        }, DEBOUNCE_MS)
      );
    };

    const stop = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const start = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled || channel) return;

      let ch = supabase.channel("crm-shared-sync");
      for (const [table, keys] of Object.entries(TABLE_KEYS)) {
        ch = ch.on("postgres_changes", { event: "*", schema: DB_SCHEMA, table }, () => {
          for (const key of keys) invalidateLater(key);
        });
      }
      channel = ch.subscribe();
    };

    start();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") stop();
      else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") start();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      for (const t of timers.values()) clearTimeout(t);
      stop();
    };
  }, [queryClient]);

  return null;
}
