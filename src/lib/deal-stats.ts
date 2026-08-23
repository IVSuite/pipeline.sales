// Pure aggregation of deal rows into per-lead stats. Computed on read from the
// deals table (via deals.lead_id) so the numbers are always current and are
// never stored/duplicated on the leads table.

export interface DealStat {
  count: number;
  total: number;
}

/** A minimal deal row shape needed to aggregate by lead. */
export interface DealStatRow {
  lead_id: string | null;
  value: number | string | null;
}

/**
 * Aggregates deal rows into a map of lead_id -> { count, total }.
 * Rows without a lead_id are ignored. `value` is coerced to a number; missing /
 * non-numeric values count as 0. Leads with no deals are simply absent from the
 * map (callers default them to 0/0).
 */
export function aggregateDealStatsByLead(rows: DealStatRow[]): Map<string, DealStat> {
  const map = new Map<string, DealStat>();
  for (const row of rows) {
    if (!row.lead_id) continue;
    const stat = map.get(row.lead_id) ?? { count: 0, total: 0 };
    stat.count += 1;
    stat.total += Number(row.value) || 0;
    map.set(row.lead_id, stat);
  }
  return map;
}
