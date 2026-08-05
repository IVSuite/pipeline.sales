# Milestones M0–M5

Delivery loop: understand pain → smallest useful increment → build → team hands → observe → refine → **save as skill**.

**No fixed dates here.** Each milestone has **acceptance criteria** — what demonstrably works when done. **Do not start the next milestone until the current one is live and stable.**

---

## Overview

| Milestone | Done means (summary) |
|-----------|----------------------|
| **M0** | Data exists — order book, price list, template, clients by phone |
| **M1** | Team talks to order book daily via tools + UI |
| **M2** | Sales engine — follow-ups, quotations, PDF, quote IDs |
| **M3** | Money and gates — payments, order confirm, invoice, handoff |
| **M4** | Production and delivery — COGS, MO status, delivery slots |
| **M5** | Harness deepens — orchestration, automation, model tiering |

---

## M0 — The data exists

### Acceptance criteria

- [ ] Order book created (single Supabase project)
- [ ] Price list, discount sheet, corrected quotation template digitized
- [ ] Known clients imported with **phone as unique key**
- [ ] Any question about a client or order is answered from **tables**, not memory or chats

### Work items

| Task | Source material |
|------|-----------------|
| Merge Supabase projects | `pipeline.sales/supabase/migrations/` as base |
| Seed catalog | `IV-quotation-app/iv-catalog.js` |
| Extract template/terms | `IV-quotation-app/quotation.html` default copy |
| Import clients | Spreadsheet: phone, name, type (B2B/B2C) |

### Exit demo

> “Show me everything we know about client +20XXXXXXXX.” — One query, one screen.

---

## M1 — The team talks to the order book

### Acceptance criteria

- [ ] AI workspace connected via **MCP**
- [ ] First instruction document: intake, dedupe, assignment
- [ ] First tools: `create_lead`, `find_client`, `assign_lead`
- [ ] Leads flow through system **daily**; team **prefers it** to old way
- [ ] CRM UI (`pipeline.sales`) reads/writes **same tables** as tools

### Work items

| Task | Notes |
|------|-------|
| MCP server wrapping lead/client tools | Share with chat workspace |
| Dedupe by phone | Route to owning rep |
| Round-robin assignment + leave handling | In tool logic + instructions |
| Mirror critical events to WhatsApp | Transition aid — system still source of truth |

### Exit demo

> Moderator creates lead in chat → appears in CRM Kanban → assigned rep notified.

**Real product at M1:** The **habit** — not the model.

---

## M2 — The sales engine runs

### Acceptance criteria

- [ ] Contact records on leads
- [ ] Follow-up engine: 0/1/3/7 cadence, deferrals, mandatory loss reasons, 6-month revival
- [ ] Quotations: **sequential IDs**, discount gate, template PDF
- [ ] No lead forgotten; every quote traceable by ID
- [ ] Quotation UI ported from standalone app into unified CRM

### Work items

| Task | Source material |
|------|-----------------|
| Port quotation editor | `IV-quotation-app/quotation.html` → React in `pipeline.sales` |
| Link `deals` ↔ `quotations` | Schema + UI "Open quote" on deal |
| Server-side PDF generation | Replace browser-only export |
| `draft_quote`, `request_discount_approval` tools | Governance gates |
| Follow-up scheduled jobs | Bridge desk automation |

### Exit demo

> Rep opens deal → builds quote → manager approves discount → PDF issued with quote ID → deal stage = Proposal Sent.

---

## M3 — Money and gates

### Acceptance criteria

- [ ] Accountant **confirmed** payments (extract pre-fill allowed; evidence attached)
- [ ] Deposit confirmation converts quotation → **order**
- [ ] Automatic invoice + operations handoff on confirm
- [ ] Tax flag on B2B orders
- [ ] Balance reminders
- [ ] Void-and-reissue correction flow works

### Exit demo

> Accountant records 60% deposit with screenshot attached → order created → invoice emailed → ops sees MO in queue.

---

## M4 — Production and delivery

### Acceptance criteria

- [ ] Effective-dated material price table
- [ ] Dimension-driven BOMs
- [ ] Draft-then-confirmed COGS (quoted vs actual logged)
- [ ] Production statuses visible to sales
- [ ] Zone-batched delivery scheduling
- [ ] **Full-payment gate** on delivery slot confirm

### Exit demo

> Sales asks “Where is order #123?” — status from system. Delivery slot blocked until balance zero.

---

## M5 — The harness deepens

### Acceptance criteria

- [ ] Orchestrated desks with per-domain prompts **if volume justifies**
- [ ] Expanded automation library
- [ ] Model-tiering / local-model evaluation for sensitive paths **from evidence**

Decisions deferred until here — not guessed upfront.

---

## Map: current repos → milestones

```text
IV-quotation-app          pipeline.sales
      │                          │
      │    BOTH → M0 merge       │
      └──────────┬───────────────┘
                 ▼
              M0  Order book
                 ▼
              M1  MCP + leads (CRM shell live)
                 ▼
              M2  Port quotation app HERE
                 ▼
              M3  Finance (new)
                 ▼
              M4  Operations (new)
                 ▼
              M5  Orchestration + model strategy
```

| Repo feature | Milestone |
|--------------|-----------|
| CRM auth, Kanban, deals | M0–M1 base |
| Lead/company CRUD | M1 |
| Quotation editor, PDF, catalog | M2 |
| Browser cabinet import | M2 prototype → M2/M3 server tool |
| Cloud sync in HTML app | **Replace** with order book realtime |
| Payments, MO, delivery | M3–M4 (not in repos yet) |

---

## What NOT to do between milestones

| Don't | Why |
|-------|-----|
| Add ERP modules (inventory, HR, accounting) | Scope creep — order book first |
| Train a custom model | Harness principle |
| Maintain two production databases | Principle 1 |
| Auto-finalize payments from screenshots (no confirm) | Principle 3 |
| Skip M0 because CRM “already works” | CRM lacks quote/order/payment chain |

---

## Related

- [What's next — immediate steps](./WHATS-NEXT.md)
- [Current state & gap](./02-current-state-and-gap.md)
- [Operating model](./09-operating-model-and-risks.md)
