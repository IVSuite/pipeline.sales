// Shapes returned by API routes once Supabase embeds related rows (see the
// `SELECT` constants in src/app/api/**/route.ts). Kept separate from the base
// database.ts interfaces since those represent raw table rows.

import type { Company, Customer, Deal, Lead, Note, Activity, Task } from "@/types/database";

export interface ProfileRef {
  id: string;
  full_name: string;
}

export interface CompanyWithRelations extends Company {
  owner: ProfileRef | null;
}

export interface LeadWithRelations extends Lead {
  company: { id: string; name: string } | null;
  assignee: ProfileRef | null;
  /** Number of deals linked to this lead (computed on read; not stored). */
  deals_count: number;
  /** Sum of the values of deals linked to this lead (computed on read; not stored). */
  deals_total_value: number;
}

export interface CustomerWithRelations extends Customer {
  company: { id: string; name: string } | null;
  assignee: ProfileRef | null;
}

export interface DealWithRelations extends Deal {
  company: { id: string; name: string } | null;
  owner: ProfileRef | null;
  lead: { id: string; full_name: string } | null;
  customer: { id: string; full_name: string } | null;
}

export interface TaskWithRelations extends Task {
  assignee: ProfileRef | null;
}

export interface NoteWithAuthor extends Note {
  author: ProfileRef | null;
}

export interface ActivityWithCreator extends Activity {
  creator: ProfileRef | null;
}
