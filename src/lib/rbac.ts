import "server-only";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient, createBearerClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads an `Authorization: Bearer <token>` header, if the request carries one.
 * Other IV Suite modules (Marketing) call a few of our API routes this way
 * because they run on another origin and cannot present this app's cookies.
 */
async function bearerToken(): Promise<string | null> {
  const value = (await headers()).get("authorization");
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match ? match[1].trim() : null;
}

/**
 * Resolves the current authenticated user's profile, or throws a 401 ApiError.
 *
 * The session comes from this app's cookies, or — for cross-origin callers —
 * from a bearer token. Both paths verify the JWT with Supabase Auth and then
 * read `profiles` through RLS as that user, so a bearer caller gets exactly the
 * rights of the same user signed in here, no more.
 */
export async function requireUser(): Promise<{ profile: Profile; supabase: ServerSupabase }> {
  const token = await bearerToken();
  const supabase = (token ? createBearerClient(token) : await createClient()) as ServerSupabase;
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

  if (!user) {
    throw new ApiError("Not authenticated", 401);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new ApiError("Profile not found", 401);
  }

  return { profile: profile as Profile, supabase };
}

/** Throws a 403 ApiError unless the profile's role is in `roles`. */
export function requireRole(profile: Profile, roles: UserRole[]) {
  if (!roles.includes(profile.role)) {
    throw new ApiError("Insufficient permissions", 403);
  }
}

export function isAdminOrManager(role: UserRole) {
  return role === "admin" || role === "manager";
}

/** Converts a thrown ApiError (or generic error) into a JSON NextResponse. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  // PostgREST throws PGRST116 when `.single()` gets zero rows. On an update/delete
  // this almost always means Row Level Security silently filtered out a row the
  // caller isn't allowed to touch (rather than the row not existing at all) —
  // Postgres RLS makes those two cases indistinguishable by design.
  if (typeof error === "object" && error !== null && "code" in error && error.code === "PGRST116") {
    return NextResponse.json(
      { error: "Not found, or you don't have permission to modify this record" },
      { status: 403 }
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
