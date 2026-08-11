"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Pipeline data lives in the `pipeline` schema of the IV-Suite master project.
    { db: { schema: "pipeline" } }
  );
}
