import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Resolves the current authenticated user's profile, or throws a 401 ApiError. */
export async function requireUser(): Promise<{ profile: Profile; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
