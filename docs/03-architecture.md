# Reference architecture — six layers

The platform is organized in **six layers**. Requests flow **down** (person → assistant → tool → database). Events flow **up** (payment confirmed → notifications → manufacturing order).

Each layer can evolve independently because interfaces between them are standard (especially **MCP** for tools).

---

## Layer stack

| Layer | Name | What it contains |
|-------|------|------------------|
| **L6** | **Experience** | Chat-first interface for the team; structured forms for repetitive entry; evidence attachments (images, documents). Chat is the **main door**, not the only door. |
| **L5** | **Orchestration** | Receives every request, identifies intent, routes to the right specialist assistant (each runs under its own system prompt). |
| **L4** | **Reasoning** | Language models + skill library. Shaped by instructions and skills, **never by training**. Models swappable; harness persists. |
| **L3** | **Tools & automation** | Small, single-purpose, permission-checked scripts via **MCP**. Scheduled and event-triggered jobs run **after** human approval. |
| **L2** | **Data** | Order book (Postgres/Supabase), file store for evidence, reference tables (price list, discounts, material prices, BOM formulas). |
| **L1** | **Governance** | Identity and roles, approval gates, append-only audit log. |

```text
┌───────────────────────────────────────────── L6 Experience ────┐
│  Chat UI · CRM UI (pipeline.sales) · Forms · Attachments       │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────── L5 Orchestration ─┐
│  Route intent → Sales / Finance / Ops / Bridge desk            │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────── L4 Reasoning ─────┐
│  LLM + instructions + skills                                   │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────── L3 Tools ───────────┐
│  create_lead · draft_quote · record_payment · notify · … (MCP) │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────── L2 Data ────────────┐
│  Order book · Storage · Price list · BOM · Material prices       │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────── L1 Governance ──────┐
│  Auth · RBAC · Approval gates · Audit log                      │
└────────────────────────────────────────────────────────────────┘
```

---

## How a request travels (example)

1. Moderator types a new lead in chat: name, phone, source.
2. **Orchestrator** (L5) recognizes intake → routes to **Sales Desk** (L4).
3. Assistant calls **`create_lead`** tool (L3) with typed fields.
4. Tool validates phone format, finds existing **client** by phone (L2), assigns to owning rep per dedupe rule.
5. Tool writes **lead** row; **audit log** records actor + time (L1).
6. Assistant replies in plain language (L6).

No pre-designed screen carried the business rule — the rule lived in an **instruction document** and **tool validation**.

---

## Mapping current repos to layers

| Layer | Today | Target |
|-------|-------|--------|
| L6 | CRM UI + standalone quotation HTML | Unified app: CRM + quote editor + forms |
| L5 | — | Add when one prompt is insufficient (M5 path) |
| L4 | — | AI workspace + MCP (M1+) |
| L3 | Inline JS in quotation.html; CRM API routes | Extract to MCP tools + shared API |
| L2 | Two Supabase projects | **One** order book |
| L1 | CRM RLS only | Gates on quote, payment, COGS, delivery |

---

## Two doors, one database

Forms and chat must call the **same tools**:

```text
   Chat message ──► Orchestrator ──► tool ──┐
                                            ├──► Order book
   Lead form (CRM UI) ──► API ──► tool ────┘
```

`pipeline.sales` forms already exist for leads/deals. Quotation actions should use the same pattern — not a separate save path in `quotation.html`.

---

## Event flow (automation up)

Example: accountant confirms deposit (human gate at L1/L3):

```text
record_payment (approved)
    │
    ├──► quotation → order (status change)
    ├──► issue_invoice (tool)
    ├──► create_manufacturing_order (tool)
    ├──► notify_operations (Bridge desk)
    └──► audit log entries
```

Scripts handle repetition **after** the human gate. See [06-reasoning-and-tools.md](./06-reasoning-and-tools.md#automation).

---

## Related

- [AI workforce (desks)](./05-ai-workforce.md)
- [Data model](./04-data-model.md)
- [Governance](./07-governance.md)
