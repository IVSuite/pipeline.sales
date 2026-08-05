# What's next — for the IV build team

You have **two working tools** in this repo. They solve real problems. They do **not** share data, IDs, or workflow — and that is the ceiling.

This page says what to do about it, in plain language.

---

## Where you are today

```text
WhatsApp / memory / screenshots          Two apps in this repo
         │                                        │
         │    manual copy-paste                   │
         └──────────────────►  pipeline.sales  ──┼──►  Supabase B (CRM only)
                              IV-quotation-app ──┼──►  Supabase A (quotes only)
                                                 │
                                                 └──►  No single client record
                                                       No quote ID on the deal
                                                       No audit trail across both
```

| You have | It does well | It cannot do alone |
|----------|--------------|-------------------|
| **`IV-quotation-app/`** | Kitchen quotation PDFs, cabinet import, catalog, cloud projects | Know who the lead is, deal stage, payments, production |
| **`pipeline.sales/`** | Leads, deals, Kanban, tasks, roles, dashboard | Build or store the quotation, link PDF to deal |

**Both are prototypes of parts of one system.** Treat them as **source material**, not as two products to maintain forever.

---

## Where you are going

**One order book** — one database where client, lead, quote, order, payment, production, and delivery are **one linked chain**.

**One front door** — chat-first (what the team already uses) plus forms for repetitive entry. Same data either way.

**Small tools, not a big ERP** — each action (create lead, draft quote, record payment) is a **permission-checked tool**. Business rules live in **instruction documents** and tool validation, not scattered across two codebases.

**Humans approve; AI drafts** — nothing financial or final goes out without a named person confirming. Everything is logged.

Full design: [Blueprint](./BLUEPRINT.md) and [Architecture](./03-architecture.md).

---

## What to build instead of isolation

### Stop doing

- Adding features to `quotation.html` and `pipeline.sales` in parallel without a shared schema
- Creating a second Supabase project for new features
- Copying client names and amounts between apps
- Treating WhatsApp as the system of record

### Start doing

1. **M0 — One order book**  
   Single Supabase project. Tables for client (phone key), lead, quote, catalog/price list. Import known clients.  
   → Use `pipeline.sales/supabase/migrations/` as the starting point; extend schema per [Data model](./04-data-model.md).

2. **M1 — Team talks to the order book**  
   Connect an AI workspace to the database via **MCP tools**: create lead, find client, assign lead.  
   → CRM UI in `pipeline.sales` reads/writes the **same** tables.

3. **M2 — Sales engine**  
   Port quotation logic from `IV-quotation-app/quotation.html` into the unified app: sequential quote IDs, PDF from template, discount gates.  
   → `iv-catalog.js` seeds the shared catalog table once.

4. **M3+ — Money, production, delivery**  
   Only after M0–M2 are stable. See [Milestones](./08-milestones.md).

---

## Your immediate next steps (practical)

| Step | Owner | Action |
|------|-------|--------|
| 1 | Builder | Read [M0 acceptance criteria](./08-milestones.md#m0--the-data-exists) |
| 2 | Builder | Draft merged schema: CRM tables + `quotations`, `quotation_versions`, `line_items`, `catalog` |
| 3 | Rules owner | Export current price list, discount rules, quotation template from live practice |
| 4 | Team | List 20 real clients with phone numbers for import (phone = unique client key) |
| 5 | Builder | Point **both** apps at one Supabase URL (dev) or freeze quotation app features until merge |
| 6 | Everyone | Weekly: ship one small increment; write what you learned into a **skill** doc |

**First demo target (M0 done):**  
Ask “What quotes did we send client X?” — answer comes from **one database**, not chat history.

**Second demo target (M1 done):**  
Create a lead in chat or CRM; it appears in the order book; assignment and dedupe work.

**Third demo target (M2 done):**  
Open a deal → build quote in-app → export PDF → deal shows “Proposal Sent” with quote ID.

---

## How the two repos merge (conceptual)

```text
pipeline.sales/                    IV-quotation-app/
├── Auth, RBAC, layout      ──►    ├── Quotation editor UI (port to React)
├── Leads, deals, tasks            ├── PDF generation (move server-side)
├── Kanban, dashboard              ├── Catalog seed (iv-catalog.js → DB)
└── supabase/migrations/           └── Cabinet import (later: tool/API, not browser-only)
         │
         └──────────►  ONE repo / ONE app / ONE Supabase  ◄──────────
```

Suggested working name for the unified app: keep `pipeline.sales` as the shell; add a `quotations` module; archive standalone `quotation.html` once parity is reached.

---

## Reasoning about AI (don't skip this)

You do **not** need to train a model. You need:

- Clean **data** (order book)
- Clear **instructions** (system prompts per desk)
- Strict **tools** (MCP — model never writes DB directly)
- Saved **skills** (quotation skill, follow-up skill, etc.)

Climb the [reasoning ladder](./06-reasoning-and-tools.md#the-reasoning-ladder) only when usage demands it. Day one = one prompt + a few tools.

---

## Document map

The full blueprint is split into this folder for easy navigation:

→ [Full index](./README.md)

---

## One sentence to align the team

**We are not building another ERP — we are building one order book, a library of small tools, and assistants that use them — so memory and WhatsApp stop being the system.**
