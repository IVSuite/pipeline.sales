# Reference architecture — app + AI layers

The system has **two tracks** on **one stack**. See [00-dual-approach.md](./00-dual-approach.md).

```text
TRACK A — App (primary)          TRACK B — AI overlay (optional)
CRM · quotes · forms · PDF       Chat · MCP · extract→confirm · skills
        │                                  │
        └──────────►  L2 Data  ◄───────────┘
                    (one order book)
```

The **six layers** below describe the **full platform** including Track B. **Track A** uses **L1, L2, L6** directly (governance, database, app UI). **L3–L5** are added when the app alone is not enough.

---

## Layer stack

| Layer | Name | Track A (app) | Track B (AI) |
|-------|------|---------------|--------------|
| **L6** | **Experience** | **Primary:** CRM UI, quotation forms, Kanban, payment screens | Optional: chat as second door to same APIs |
| **L5** | **Orchestration** | — | Route chat to desks (M5, if needed) |
| **L4** | **Reasoning** | — | LLM + skills for messy input / assist |
| **L3** | **Tools & automation** | API routes, cron, server PDF | MCP tools; extract jobs; event scripts after confirm |
| **L2** | **Data** | **Shared:** order book, Storage, price list, catalog | Same tables — AI never gets a separate DB |
| **L1** | **Governance** | **Shared:** auth, RBAC, gates, audit log | Same gates on tools and API |

```text
┌──────────────────────── L6 — App UI (Track A) ────────────────────────┐
│  pipeline.sales · quotation module · forms · Kanban · PDF export      │
└───────────────────────────────┬───────────────────────────────────────┘
                                │  optional
┌──────────────────────── L6b — Chat (Track B) ─────────────────────────┐
│  MCP / assistant ──► same API routes as forms                         │
└───────────────────────────────┬───────────────────────────────────────┘
                                ▼
┌──────────────────────── L3 — APIs & jobs ─────────────────────────────┐
│  /api/leads · /api/deals · extract_queue · record_payment · cron      │
└───────────────────────────────┬───────────────────────────────────────┘
                                ▼
┌──────────────────────── L2 — Order book (Supabase) ───────────────────┐
└───────────────────────────────┬───────────────────────────────────────┘
                                ▼
┌──────────────────────── L1 — Governance ──────────────────────────────┐
└───────────────────────────────────────────────────────────────────────┘
```

---

## Example: lead intake (app vs AI)

**Track A — rep uses CRM form:**

1. Rep opens Leads → New lead form (L6 app).
2. POST `/api/leads` validates phone, dedupes, assigns (L3 app API).
3. Row written to order book (L2); audit log (L1).

**Track B — moderator uses chat (optional, same outcome):**

1. Message in chat (L6).
2. Assistant calls `create_lead` MCP tool (L3–L4) — **same validation as API**.
3. Same L2 write and L1 log.

**Build order:** ship Track A first. Add Track B when WhatsApp lag hurts adoption.

---

## Example: cabinet import (Track B on Track A data)

1. Rep uploads PDF in quotation screen (L6 app).
2. Server **extract** job pre-fills line items (L3 Track B).
3. Rep **confirms** rows in review UI (L6 app) — extract → confirm.
4. Confirmed rows saved to `line_items` (L2).

No LLM required for saving — only for extraction step. Simple CSV imports may stay **Track A only**.

---

## Mapping current repos

| Layer | `pipeline.sales` | `IV-quotation-app` |
|-------|------------------|---------------------|
| L6 app | CRM shell — **continue** | Quotation UI — **port into CRM** |
| L3 | API routes — **extend** | Browser import — **move to server extract** |
| L2 | Migrations base — **merge** | Catalog seed — **one DB** |
| L1 | RBAC — **extend to quotes/payments** | Embedded keys — **remove** |
| L4–L5 | — | Add when app + extract queue live |

---

## Event flow (non-AI automation counts as Track A)

Accountant clicks **Confirm payment** in app (L6):

```text
POST /api/payments/confirm
    ├──► order created
    ├──► invoice job (cron/API)
    ├──► notify ops (email/WhatsApp mirror)
    └──► audit log
```

No LLM in this path — still architecture-compliant.

---

## Related

- [Dual approach](./00-dual-approach.md)
- [AI workforce (desks)](./05-ai-workforce.md) — Track B org design
- [Data model](./04-data-model.md)
- [Governance](./07-governance.md)
