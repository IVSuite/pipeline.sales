import "server-only";

import { NextResponse, type NextRequest } from "next/server";

/* ---------------------------------------------------------------------------
 * Cross-origin access for the API routes that other IV Suite modules call.
 *
 * The Marketing module reuses this app's Leads bulk importer instead of
 * carrying a second copy of the parse / validate / dedupe / insert logic. It
 * runs on a different origin (the IV Suite desktop shell's webview, or its own
 * dev server), so those routes need CORS headers — and only those routes get
 * them: this helper is opted into per route, never applied globally.
 *
 * Security model:
 *   - Cross-origin callers authenticate with `Authorization: Bearer <token>`
 *     (see `requireUser`). Cookies are never accepted cross-origin: no
 *     `Access-Control-Allow-Credentials` is ever sent, so a browser will not
 *     attach this app's session cookies to a cross-origin call, and any
 *     preflighted request from a third-party page is refused by the browser.
 *   - The origin allowlist is therefore hygiene, not the authorization
 *     boundary — a token is what grants access, and RLS is what limits it.
 *
 * Allowed origins: the IV Suite shell (Tauri serves its webview from
 * `tauri.localhost` on Windows and `tauri://localhost` elsewhere), a Capacitor
 * mobile build, and any localhost port for local development. Override or
 * extend with `PIPELINE_CORS_ORIGINS` (comma-separated; `*` allows any origin).
 * ------------------------------------------------------------------------- */

const DEFAULT_ALLOWED_ORIGINS = [
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
  "capacitor://localhost",
];

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function allowedOrigins(): string[] {
  const env = process.env.PIPELINE_CORS_ORIGINS;
  if (!env) return DEFAULT_ALLOWED_ORIGINS;
  return env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  const list = allowedOrigins();
  if (list.includes("*") || list.includes(origin)) return true;
  // Local development of any IV Suite module, unless the env override is set.
  return !process.env.PIPELINE_CORS_ORIGINS && LOCALHOST_RE.test(origin);
}

/** CORS response headers for `request`, or an empty object when its origin is not allowed. */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "Content-Disposition",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/** Preflight handler: export as `OPTIONS` from a route that opts into CORS. */
export function preflight(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

type Handler<C> = (request: NextRequest, ctx: C) => Promise<Response> | Response;

/** Wraps a route handler so every response (success or error) carries the CORS headers. */
export function withCors<C>(handler: Handler<C>): Handler<C> {
  return async (request, ctx) => {
    const response = await handler(request, ctx);
    for (const [key, value] of Object.entries(corsHeaders(request))) {
      response.headers.set(key, value);
    }
    return response;
  };
}
