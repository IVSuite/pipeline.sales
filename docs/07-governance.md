# Governance — permissions, gates, corrections

**Identity is the foundation.** Every person logs in as themselves. Every tool call carries that identity.

Approval gates are enforced in **tool code** and logged to the **audit log**.

---

## Roles (minimum)

| Role | Typical actions |
|------|-----------------|
| Moderator | Intake, assign leads |
| Sales rep | Contacts, draft quotes |
| Designer | Attach drawings, support quotation |
| Sales manager | Approve discounts, non-standard deposits |
| Accountant | Record payments, confirm orders, issue invoices |
| Operations manager | Confirm COGS, production status, delivery queue |

Map to `pipeline.sales` roles today (`admin`, `manager`, `sales_rep`) and **extend** — do not shrink.

---

## Approval gates

| Gate | Rule | Enforced in |
|------|------|-------------|
| **Discount beyond standard sheet** | Quote cannot be issued until sales manager approves in-system | `issue_quote` / `draft_quote` tool |
| **Non-standard deposit** | Anything other than 60% down or 100% full requires logged manager approval | `record_payment` / deposit tool |
| **Order confirmation** | Only accountant **confirmed** payment (after extract + review if used) converts quotation → order. Rep's word is **not** a trigger | `confirm_order` tool |
| **COGS confirmation** | Draft COGS computed; ops manager reviews, may override, confirms. Both draft and confirmed logged | `compute_cogs`, `confirm_cogs` |
| **Delivery release** | Slot cannot confirm unless **full payment** recorded | `book_delivery_slot` tool |

---

## Extract, then confirm (gate companion rule)

| Step | Rule |
|------|------|
| Upload | Screenshot or document stored as **evidence** on the row |
| Extract | System pre-fills amount, date, phone, or line items into a **draft** — rep or accountant reviews |
| Confirm | Named person taps **Confirm** (or edits then confirms); tool writes to order book |
| Auto-finalize | **Forbidden** — extraction alone never triggers order confirm, delivery release, or issued quote |

| Field type | Workflow |
|------------|----------|
| Phone, amounts, dates | Extract → **confirm** (edit if wrong) → save |
| Bank transfer screenshot | Evidence + optional extract pre-fill → accountant **confirms** payment |
| WhatsApp export | Evidence; amounts only enter system after **confirm** |
| Cabinet / price list PDF | Extract → **review queue** → rep confirms rows (M2+) |

Violating confirm-before-save breaks audit trust and finance accuracy.

---

## Audit log

Append-only. Every row includes:

- `actor_id` (user)
- `action` (e.g. `quote.approved`, `payment.recorded`, `order.confirmed`)
- `entity_type` + `entity_id`
- `payload` (JSON snapshot or diff)
- `created_at`

**Never delete.** Corrections extend history; they don't erase it.

---

## Corrections and rollback

When someone errs on a financial document:

1. **Do not** silently edit confirmed records
2. Authorized person **voids** the record
3. Authorized person **re-issues** replacement
4. Audit log links void → replacement

Quoted vs actual COGS history stays intact for margin analysis.

---

## Fixing today's security gaps

| Issue | Location | Fix at merge |
|-------|----------|--------------|
| Embedded Supabase keys | `quotation.html` | Env vars + RLS; rotate keys |
| Open RLS "team all" | `CLOUD-SETUP.md` example | Role-based policies |
| No quote approval trail | Quotation app | Gate + audit on issue |
| CRM without finance roles | `pipeline.sales` | Add accountant / ops roles |

---

## Related

- [Vision — principles 2–4](./01-vision-and-principles.md)
- [Data model](./04-data-model.md)
- [Milestones M3+](./08-milestones.md)
