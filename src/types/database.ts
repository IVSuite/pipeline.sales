// Domain types mirroring supabase/migrations/0001_init.sql. Kept hand-written
// (rather than generated) since Phase 1 has no live Supabase project to
// generate against — regenerate with `supabase gen types typescript` once a
// project exists and swap these for the generated output if desired.

export type UserRole = "admin" | "manager" | "sales_rep";

export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "converted";

export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export type DealStage =
  | "new_lead"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

export type ActivityType = "note" | "email" | "call" | "meeting" | "status_change" | "attachment";

export type EntityType = "lead" | "customer" | "deal" | "company";

export type NotificationType =
  | "deal_stage_changed"
  | "task_overdue"
  | "lead_assigned"
  | "customer_updated";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  full_name: string;
  company_id: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  lead_source: string | null;
  assigned_to: string | null;
  deal_value: number;
  status: LeadStatus;
  priority: PriorityLevel;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  assigned_to: string | null;
  converted_from_lead_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  title: string;
  lead_id: string | null;
  customer_id: string | null;
  company_id: string | null;
  value: number;
  stage: DealStage;
  owner_id: string | null;
  expected_close_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: PriorityLevel;
  status: TaskStatus;
  assigned_to: string | null;
  related_lead_id: string | null;
  related_deal_id: string | null;
  reminder_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  type: ActivityType;
  body: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  entity_type: EntityType | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const DEAL_STAGES: { value: DealStage; label: string }[] = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

export const PRIORITY_LEVELS: PriorityLevel[] = ["low", "medium", "high", "urgent"];
export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "unqualified", "converted"];
export const TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed", "overdue"];
export const USER_ROLES: UserRole[] = ["admin", "manager", "sales_rep"];
