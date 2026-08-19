import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { DB_SCHEMA } from "./config";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely —
 * only import this from server-only code (route handlers, server actions)
 * that has already performed its own authorization check. Never expose the
 * service role key to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: DB_SCHEMA },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
