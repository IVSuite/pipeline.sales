import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Pipeline data lives in the `pipeline` schema of the IV-Suite master project.
      db: { schema: "pipeline" },
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

  // Refreshes the session and rotates tokens; the new tokens are written onto
  // `response` via the setAll callback above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // Build a redirect that PRESERVES any auth cookies Supabase just refreshed.
  // Returning a bare `NextResponse.redirect()` would drop those Set-Cookie
  // headers, so the browser keeps replaying the old (already-rotated) refresh
  // token, the session never sticks, and the app bounces /dashboard ⇄ /login
  // forever → ERR_TOO_MANY_REDIRECTS. Copying the cookies over is the fix the
  // Supabase SSR docs call out. Same-origin (clones request URL) so it never
  // leaves the current host (e.g. a Preview deployment).
  const redirectTo = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (params) {
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    }
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user && !isPublicPath) {
    return redirectTo("/login", { redirectTo: pathname });
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return redirectTo("/dashboard");
  }

  return response;
}
