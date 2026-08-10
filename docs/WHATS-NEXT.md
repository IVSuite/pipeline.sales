# What's next — for the IV build team

You have **two working apps** on databases. They work. They are **not connected** — that is the first fix.

This project uses a **dual approach**: keep building **simple app + database** where that is enough; use **AI and the blueprint** only for what the app cannot do well or for **on-top efficiency** (extract → confirm, chat intake, scale).

→ Decision guide: [00-dual-approach.md](./00-dual-approach.md)

---

## Where you are today

```text
WhatsApp / memory                    Two apps (both valid Track A pieces)
         │                                    │
         └──────── manual copy ──────────────┼──►  pipeline.sales  → Supabase B
                                              └──►  IV-quotation-app → Supabase A
```

| App | Track A (continue) | Track B (add later) |
|-----|-------------------|---------------------|
| **`pipeline.sales`** | CRM, Kanban, tasks, roles, dashboard | Chat/MCP intake, dedupe assist, follow-up nudges |
| **`IV-quotation-app`** | Quote editor, PDF, catalog, line items | Cabinet PDF extract → review → confirm |

**Do not throw away either app.** Merge them into **one app on one database**, then add AI only on top where needed.

---

## Dual approach in one picture

```text
┌─────────────────────────────────────────────────────────────┐
│  TRACK A — Simple app (build first, keep using)             │
│  pipeline.sales + quotation module · forms · Kanban · PDF   │
│  Supabase order book · RBAC · cron jobs                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ same APIs & tables
┌──────────────────────────────▼──────────────────────────────┐
│  TRACK B — AI / blueprint (only where app isn't enough)     │
│  PDF/cabinet extract→confirm · chat intake · skills · MCP │
│  Makes team faster — does not replace screens               │
└─────────────────────────────────────────────────────────────┘
```

---

## What to do first (Track A — app)

These do **not** require LLM or MCP:

1. **M0 — One order book**  
   Single Supabase. Clients by phone. Merge catalog from `iv-catalog.js`.  
   Base: `pipeline.sales/supabase/migrations/`

2. **M2 — Quotation inside CRM**  
   Port `quotation.html` into the CRM app. Link deal ↔ quote. PDF on deal timeline.

3. **M3 — Payments in the app**  
   Payment form: amount, date, evidence upload, **Confirm** button. Gates in code.

**Demo targets (app only):**

- M0: “Everything about client X” from one database  
- M2: Deal → build quote → export PDF → stage = Proposal Sent  
- M3: Accountant confirms payment → order created  

---

## What to add later (Track B — AI / blueprint)

Only after Track A works for daily use:

| When team feels pain | Track B addition |
|----------------------|------------------|
| Re-keying cabinet PDFs | Extract → review queue → confirm into line items |
| Leads start in WhatsApp | Chat/MCP calling same `create_lead` API as the form |
| Follow-ups forgotten at volume | Scheduled nudges + optional assistant |
| One prompt can't cover finance + sales | Desks / orchestrator (M5) |

Full blueprint scope: [BLUEPRINT.md](./BLUEPRINT.md) — architecture, desks, governance.

---

## Stop / start

| Stop | Start |
|------|-------|
| Two Supabase projects | One order book |
| Parallel features in both repos without shared schema | CRM shell + quotation module |
| Waiting for AI before CRM merge | M0 + M2 on app track |
| Replacing forms with chat for structured data | Forms primary; chat optional |
| Auto-saving extracted payments without confirm | Extract → confirm in UI |

---

## Immediate steps

| Step | Track | Action |
|------|-------|--------|
| 1 | A | [M0 criteria](./08-milestones.md#m0--the-data-exists) |
| 2 | A | Merge schema: CRM + `quotations` + `line_items` + `catalog` |
| 3 | A | Port quotation UI into `pipeline.sales` |
| 4 | B (later) | List top 3 PDF formats for cabinet import pilot |
| 5 | Both | One Supabase URL in dev; freeze standalone quotation features |

---

## Merge direction

```text
pipeline.sales/  ──►  shell (auth, deals, Kanban)
       +
IV-quotation-app/  ──►  quotations module (forms, PDF)
       =
ONE app · ONE Supabase · optional AI layer on same APIs
```

---

## One sentence to align the team

**Build the app on the database until it runs the business; use AI only where forms fail or the team needs to scale.**

→ [Full doc index](./README.md)
