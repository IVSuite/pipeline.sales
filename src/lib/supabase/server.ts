import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { DB_SCHEMA } from "./config";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Reads/writes the session via the Next.js cookie store. Must be created
 * fresh per request — never cache/reuse across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: DB_SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — safe to ignore because
            // `proxy.ts` refreshes the session on every request.
          }
        },
      },
    }
  );
}

/**
 * Supabase client bound to a bearer access token instead of the cookie jar.
 *
 * Used when another IV Suite module (the Marketing app, which runs on a
 * different origin and therefore cannot carry this app's cookies) calls one of
 * our API routes with `Authorization: Bearer <IV Suite access token>`. The token
 * is the same Supabase JWT a cookie session would hold, so every PostgREST call
 * made through this client runs as that user under exactly the same RLS as a
 * cookie session — nothing is elevated, and there is no service-role fallback.
 *
 * Sessions are never persisted or refreshed here: the caller owns the token.
 */
export function createBearerClient(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: DB_SCHEMA },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
  );
}
