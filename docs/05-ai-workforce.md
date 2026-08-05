# AI workforce — organization of assistants

Structure assistants like a **company org chart**, not a single all-purpose bot.

One orchestrator coordinates **desks** — each desk is the same (or different) model under a **different system prompt**, with scoped knowledge and scoped tools.

All desks share: **one order book**, **one tool library**, **one audit logger**.

---

## Desk overview

| Desk | Who it serves | What it does |
|------|---------------|--------------|
| **Orchestrator** | Whole system | Receives every request; routes to the right desk; **never acts on data itself** |
| **Sales Desk** | Moderator, sales reps, designer | Lead intake, dedupe, assignment (round-robin + leave), contacts, follow-up cadence, loss reasons, 6-month revival, quotation drafting, sequential IDs, discount gates |
| **Finance Desk** | Accountant, sales manager | Typed payments + evidence, deposit policy, order confirmation, tax flag, balances, invoices |
| **Operations Desk** | Operations manager | Manufacturing orders, draft COGS (BOM × material prices), confirm COGS, production status, queue priority, material price upkeep |
| **Bridge & Automation** | Whole system | In-app notifications (+ WhatsApp mirror), scheduled follow-ups, expiry nudges, completion signals, delivery slots (zone batching, full-payment gate) |

---

## Scoped knowledge and tools (by desk)

### Orchestrator

- **Knowledge:** Routing rules, desk directory, escalation paths
- **Tools:** None that mutate data — route only

### Sales Desk

- **Knowledge:** Client/lead history, price list, discount sheet, quotation skill
- **Tools:** `create_lead`, `find_client`, `assign_lead`, `log_contact`, `draft_quote`, `request_discount_approval`

Maps to **`pipeline.sales`** leads/deals/tasks today + quotation tools from **`IV-quotation-app`** after merge.

### Finance Desk

- **Knowledge:** Quotes, orders, payments, deposit policy
- **Tools:** `record_payment`, `confirm_order`, `issue_invoice`, `approve_non_standard_deposit`, `approve_discount`

Not in either repo yet — **M3**.

### Operations Desk

- **Knowledge:** Orders, BOMs, material prices, production queue
- **Tools:** `compute_cogs`, `confirm_cogs`, `update_production_status`, `reorder_queue`

**M4**.

### Bridge & Automation

- **Knowledge:** Event stream, schedules
- **Tools:** `notify`, `schedule_follow_up`, `book_delivery_slot` (gated on full payment)

Event triggers after human gates — see [06-reasoning-and-tools.md](./06-reasoning-and-tools.md#automation).

---

## Security note (read carefully)

**Desks are not security boundaries.**

A request executes only if the **human behind it** has permission. The accountant's assistant can confirm payments because **she is the accountant** — the tool checks her role, not the desk name.

This makes the audit log automatic: every action is signed by a **real identity**.

`pipeline.sales` RBAC is the foundation. Extend it to all new tools.

---

## Follow-up cadence (Sales Desk)

Documented business rules for tools + automation:

| Day | Action |
|-----|--------|
| 0 | Initial contact logged |
| 1 | First follow-up prompt |
| 3 | Second follow-up |
| 7 | Third follow-up |
| — | Open-ended deferrals allowed (with next date) |
| 6 months | Revival prompt on lost/unreachable leads |

Mandatory **loss reason** when marking lead lost.

---

## When to introduce desks (orchestration)

| Stage | Setup |
|-------|--------|
| M0–M1 | Single assistant, one system prompt |
| M2 | Add quotation + follow-up **skills** |
| M3+ | Finance and Ops tools appear — may split prompts |
| M5 | Full orchestrator + per-domain prompts if volume requires |

Do not build orchestration on day one. Climb the [reasoning ladder](./06-reasoning-and-tools.md#the-reasoning-ladder).

---

## Related

- [Architecture L5 Orchestration](./03-architecture.md)
- [Governance](./07-governance.md)
- [Milestones](./08-milestones.md)
