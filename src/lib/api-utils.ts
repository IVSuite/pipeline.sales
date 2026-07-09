import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export interface ListParams {
  page: number;
  pageSize: number;
  from: number;
  to: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search: string | null;
}

/** Parses `page`, `pageSize`, `sortBy`, `sortOrder`, and `search` query params shared by every list endpoint. */
export function parseListParams(searchParams: URLSearchParams, defaultSortBy = "created_at"): ListParams {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sortBy = searchParams.get("sortBy") || defaultSortBy;
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search");

  return { page, pageSize, from, to, sortBy, sortOrder, search };
}

export function paginatedResponse<T>(data: T[], count: number | null, params: ListParams) {
  const total = count ?? 0;
  return NextResponse.json({
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    },
  });
}

/** Converts `""` to `null` for the given keys — Postgres rejects `""` for uuid/date columns. */
export function nullifyEmptyKeys<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const result = { ...obj };
  for (const key of keys) {
    if (result[key] === "") {
      result[key] = null as T[keyof T];
    }
  }
  return result;
}

export function zodErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: "Validation failed", issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
    { status: 400 }
  );
}
