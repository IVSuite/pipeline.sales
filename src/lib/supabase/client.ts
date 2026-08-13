"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // No schema override: this app queries the default `public` schema, matching
  // the production Supabase project. (The `pipeline` schema override was for the
  // on-hold IV-Suite migration project; the current project exposes `public`.)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
