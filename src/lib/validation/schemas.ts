import { z } from "zod";

const uuid = z.string().uuid();
// No `.transform()` here on purpose — react-hook-form's zodResolver requires the
// form's input and output types to match, and a transform would make them diverge.
// Empty-string-to-null conversion for FK columns happens server-side instead
// (see `nullifyEmptyKeys` in api-utils.ts).
const optionalUuid = z.union([uuid, z.literal("")]).optional();

export const companySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  industry: z.string().max(120).optional().or(z.literal("")),
  website: z.string().max(300).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  owner_id: optionalUuid,
});
export type CompanyInput = z.infer<typeof companySchema>;

export const leadSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  company_id: optionalUuid,
  email: z.string().email("Invalid email").max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  position: z.string().max(120).optional().or(z.literal("")),
  lead_source: z.string().max(120).optional().or(z.literal("")),
  assigned_to: optionalUuid,
  // No `.default()` on these three — a schema-level default survives `.partial()`
  // in zod and fires whenever the field is merely omitted from a PATCH body,
  // silently resetting it. Defaults are applied explicitly in the POST handler
  // instead (see src/app/api/leads/route.ts).
  deal_value: z.coerce.number().min(0).optional(),
  status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  notes: z.string().max(5000).optional().or(z.literal("")),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const customerSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  email: z.string().email("Invalid email").max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  company_id: optionalUuid,
  assigned_to: optionalUuid,
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const dealSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  lead_id: optionalUuid,
  customer_id: optionalUuid,
  company_id: optionalUuid,
  // No `.default()` here — see the comment on leadSchema above for why: it would
  // fire on every `.partial()` PATCH that omits the field (e.g. a drag-and-drop
  // stage-only update), resetting it. Defaults live in the POST handler instead.
  value: z.coerce.number().min(0).optional(),
  stage: z
    .enum([
      "new_lead",
      "contacted",
      "qualified",
      "proposal_sent",
      "negotiation",
      "closed_won",
      "closed_lost",
    ])
    .optional(),
  owner_id: optionalUuid,
  expected_close_date: z.string().optional().or(z.literal("")),
});
export type DealInput = z.infer<typeof dealSchema>;

export const dealStageUpdateSchema = z.object({
  stage: z.enum([
    "new_lead",
    "contacted",
    "qualified",
    "proposal_sent",
    "negotiation",
    "closed_won",
    "closed_lost",
  ]),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  // No `.default()` — same reasoning as dealSchema/leadSchema above.
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]).optional(),
  assigned_to: optionalUuid,
  related_lead_id: optionalUuid,
  related_deal_id: optionalUuid,
  reminder_at: z.string().optional().or(z.literal("")),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const noteSchema = z.object({
  entity_type: z.enum(["lead", "customer", "deal", "company"]),
  entity_id: uuid,
  body: z.string().min(1, "Note body is required").max(5000),
});
export type NoteInput = z.infer<typeof noteSchema>;

export const activitySchema = z.object({
  entity_type: z.enum(["lead", "customer", "deal", "company"]),
  entity_id: uuid,
  type: z.enum(["note", "email", "call", "meeting", "status_change", "attachment"]),
  body: z.string().max(5000).optional().or(z.literal("")),
});
export type ActivityInput = z.infer<typeof activitySchema>;

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  role: z.enum(["admin", "manager", "sales_rep"]).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
