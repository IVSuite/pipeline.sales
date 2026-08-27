"use client";

/* ---------------------------------------------------------------------------
 * IV Suite session bridge.
 *
 * The Sales Pipeline is served from Vercel; the IV Suite shell runs on the Tauri
 * asset protocol. Different origins, so the Pipeline cannot see the session the
 * shell already established — which is why opening it used to demand a second
 * sign-in.
 *
 * When the shell embeds this app it injects `window.__IV_SUITE_SESSION__` into
 * the webview *before any page script runs*, via Tauri's initialization script.
 * Nothing travels in a URL, a query string or a network hop. This component
 * turns those tokens into a real session with `setSession()`, which stores them
 * the same way a normal sign-in would (first-party cookies for this origin, via
 * @supabase/ssr) so the Next.js middleware and every server component see them.
 *
 * Nothing here grants authority. The tokens are only accepted as an existing
 * IV Suite session; `proxy.ts` still checks approved-status and `pipeline` app
 * access on every request, and the crm.* tables still carry their RESTRICTIVE
 * app_access_guard policies. A forged `__IV_SUITE_SESSION__` is just an invalid
 * JWT that Supabase rejects.
 *
 * Outside the shell (a normal browser tab) the global is absent and this
 * component does nothing — the ordinary sign-in form still applies.
 * ------------------------------------------------------------------------- */

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type InjectedSession = { access_token?: string; refresh_token?: string };

declare global {
  interface Window {
    __IV_SUITE_SESSION__?: InjectedSession;
    __ivSuiteSignOut?: () => Promise<void>;
  }
}

export function IvSuiteBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();

    /* The shell calls this on IV Suite sign-out so the refresh token is revoked
       server-side and these cookies are cleared, rather than left in the
       WebView2 profile for the next person to open the app. */
    window.__ivSuiteSignOut = async () => {
      try {
        await supabase.auth.signOut();
      } catch {
        /* the webview is torn down straight after regardless */
      }
    };

    const injected = window.__IV_SUITE_SESSION__;
    if (!injected?.access_token || !injected?.refresh_token) return;

    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();

      // Already running this exact session: nothing to do. Without this guard
      // the component would re-apply on every client navigation and loop.
      if (data.session?.access_token === injected.access_token) return;

      const { error } = await supabase.auth.setSession({
        access_token: injected.access_token!,
        refresh_token: injected.refresh_token!,
      });
      if (cancelled) return;

      if (error) {
        // Expired or rejected handover — fall through to the normal sign-in.
        console.warn("IV Suite session handover rejected:", error.message);
        return;
      }

      // Cookies now exist, so the middleware will admit us. If we were bounced
      // to /login, continue to wherever we were headed.
      if (pathname === "/login" || pathname === "/access-denied") {
        router.replace(searchParams.get("redirectTo") || "/dashboard");
      }
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname, searchParams]);

  return null;
}
