import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DB_SCHEMA } from "./config";

/* ---------------------------------------------------------------------------
 * Session refresh + central IV Suite authorization.
 *
 * Two checks run on every non-public request:
 *   1. Is there a user at all?
 *   2. Does IV Suite say that user is approved AND permitted to open the
 *      `pipeline` application?  That answer comes from shared.my_access(), which
 *      is computed in the database from shared.profiles.status and
 *      shared.user_app_access — nothing here can widen it.
 *
 * This runs server-side, so it cannot be skipped from DevTools. It is still not
 * the last line of defence: every crm.* table carries a RESTRICTIVE
 * `app_access_guard` policy, so even a request that somehow reached a page would
 * read and write nothing.
 * ------------------------------------------------------------------------- */

/* /signup is gone: accounts are created in IV Suite only. */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/access-denied"];

type Access = {
  status?: string | null;
  is_platform_admin?: boolean | null;
  apps?: string[] | null;
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: DB_SCHEMA },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    // Signed in — now ask IV Suite whether this account may use the Pipeline.
    let access: Access | null = null;
    let lookupFailed = false;

    try {
      const { data, error } = await supabase.schema("shared").rpc("my_access");
      if (error) lookupFailed = true;
      else access = data as Access | null;
    } catch {
      lookupFailed = true;
    }

    const approved = access?.status === "approved";
    const allowed =
      approved &&
      (access?.is_platform_admin === true ||
        (Array.isArray(access?.apps) && access!.apps!.includes("pipeline")));

    if (!isPublicPath) {
      /* Fail closed. If the access lookup itself failed we do NOT fall through
         to the app — an unavailable authorization service must deny, not allow. */
      if (lookupFailed) {
        const url = new URL("/access-denied", request.url);
        url.searchParams.set("reason", "unavailable");
        return NextResponse.redirect(url);
      }
      if (!allowed) {
        const url = new URL("/access-denied", request.url);
        url.searchParams.set("reason", approved ? "no-app" : (access?.status ?? "pending"));
        return NextResponse.redirect(url);
      }
    }

    // An authorized user has no reason to sit on the login page.
    if (allowed && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // An unauthorized user must not be bounced from /access-denied into a loop.
    if (!allowed && pathname === "/login") {
      const url = new URL("/access-denied", request.url);
      url.searchParams.set("reason", approved ? "no-app" : (access?.status ?? "pending"));
      return NextResponse.redirect(url);
    }
  }

  return response;
}
