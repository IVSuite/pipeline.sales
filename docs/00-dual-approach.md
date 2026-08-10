# Dual approach — app first, AI where it earns its place

Not everything needs an LLM. Not everything should stay in WhatsApp.

This project uses **two tracks** that share **one order book** (one database):

| Track | Build with | Use when |
|-------|------------|----------|
| **A — Simple app** | Screens, forms, API routes, Supabase, scheduled jobs | The job is structured, repeatable, and a database + validation is enough |
| **B — AI layer** | LLM, extract → confirm, MCP tools, skills, chat | The job is messy, language-heavy, scales poorly manually, or sits **on top** to make Track A faster |

**Rule:** If Track A can ship something the team uses this week, **do Track A**. The blueprint and AI work focus on what Track A **cannot** do well — or what makes Track A **more efficient, effective, or scalable**.

---

## Decision flow (every new feature)

```text
New need
    │
    ▼
Can a form + database + rules handle it reliably?
    │
    ├── YES ──► Track A: build in pipeline.sales (or extend quotation module)
    │           Examples: create lead, move deal stage, issue quote ID,
    │           record confirmed payment, production status dropdown
    │
    └── NO or "too slow at scale" ──► Track B: AI / automation on top
                Examples: cabinet PDF → line items (extract → confirm),
                dedupe + route lead from free text, follow-up nudges,
                "what's blocking this order?" across records
```

---

## Track A — Continue the simple app (primary)

**What you already have proves this works:**

| Asset | Keep building as app |
|-------|----------------------|
| **`pipeline.sales`** | Auth, RBAC, leads, deals, Kanban, tasks, dashboard, notes |
| **`IV-quotation-app`** | Quotation editor, PDF, catalog, sections, materials (port into CRM) |
| **Database** | Supabase Postgres — one project, one schema, RLS |
| **Automation (non-AI)** | Cron: quote expiry flags, overdue tasks, email on order confirm |

**Characteristics of Track A work:**

- Clear fields (name, phone, amount, stage, date)
- User clicks Save / Confirm / Move card
- Business rules in code + DB constraints
- Reports = SQL queries and dashboard widgets

**Do not replace these with chat** unless chat is an optional second door to the **same** API.

---

## Track B — Blueprint / AI focus (overlay)

The [blueprint](./BLUEPRINT.md) is **not** a replacement for the CRM or quotation app. It defines the **AI and automation layer** for gaps Track A leaves open.

| Gap | Why app alone struggles | AI / blueprint response |
|-----|-------------------------|-------------------------|
| Cabinet / price list PDFs | Formats vary; columns aren't consistent | Extract → confirm → write to `line_items` |
| Lead intake from chat | Reps live in WhatsApp; typing into CRM lags | Chat/MCP calls same `create_lead` API |
| Dedupe + assignment | Rules exist but need context (phone, history) | Tool + instruction doc; optional LLM routing |
| Follow-up discipline | Easy to forget cadence at volume | Scheduled nudges + optional assistant prompts |
| Cross-record questions | Hard-coded screens don't answer ad hoc questions | Read-only tools + LLM over order book |
| Scale (many reps, many docs) | Manual re-keying doesn't scale | Extract, batch review queue, skills |

**Characteristics of Track B work:**

- Messy input (images, PDFs, free text)
- Judgment assisted, not replaced (extract → **confirm**)
- Same data as Track A — never a second database
- Adds efficiency; does not bypass gates (payments, discounts, delivery)

---

## Shared foundation (both tracks)

These apply to **everything** — app or AI:

1. **One order book** — single Supabase; linked client → lead → quote → order → …
2. **Humans approve, AI drafts** — financial and final records need named confirm
3. **Extract, then confirm** — AI pre-fills; people confirm before save
4. **Permissions per person** — RBAC on every API and tool

---

## How the two repos map to tracks

```text
Track A (continue)                    Track B (add on top)
─────────────────                    ────────────────────
pipeline.sales          ──same DB──►  MCP tools → same tables
  leads, deals, Kanban                 chat intake, dedupe assist
  auth, dashboard

IV-quotation-app        ──port in──►  cabinet PDF extract → confirm
  editor, PDF, catalog                 quotation skill (optional assist)
```

**Merge direction unchanged:** `pipeline.sales` = app shell; quotation module inside it; AI connects via tools/APIs, not parallel apps.

---

## What to build next (dual priority)

| Priority | Track | Deliverable |
|----------|-------|-------------|
| 1 | **A** | M0 — one database, merge schemas |
| 2 | **A** | M2 — quotation inside CRM, PDF on deal |
| 3 | **A** | M3 — payment form + gates (app UI, confirm button) |
| 4 | **B** | Document extract → review queue for cabinet imports |
| 5 | **B** | MCP/chat intake calling existing lead APIs (optional) |
| 6 | **B** | Follow-up nudges + skills (when volume justifies) |
| 7 | **B** | Orchestrator / desks (M5 — only if one assistant isn't enough) |

---

## One line for the team

**Build the boring app properly on the database; use AI only where forms aren't enough or where it makes the app scale.**

---

## Related

- [What's next](./WHATS-NEXT.md)
- [Vision & principles](./01-vision-and-principles.md)
- [Architecture — two layers](./03-architecture.md)
- [Milestones — app vs AI track](./08-milestones.md)
