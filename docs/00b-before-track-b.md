# Before Track B — architecture needs & tools inventory

**Mandatory gate.** No LLM, MCP, chat intake, or extract pipelines until this document is filled in for the specific Track B feature.

Track B fails when teams skip straight to “add AI” without knowing **what architecture must exist** and **which tools** the model is allowed to call.

→ Dual approach: [00-dual-approach.md](./00-dual-approach.md)

---

## When this applies

Complete **before any Track B work** (M1b, M2b, M5):

| Prerequisite | Why |
|--------------|-----|
| **M0 done** | One order book — AI reads/writes the same tables as the app |
| **M1–M2 app stable** | Forms and APIs exist; Track B is a **second door**, not the first |
| **This doc completed** | Architecture gaps and tools are named — not guessed during prompt engineering |

```text
Track A (M0–M2 minimum)
        │
        ▼
┌───────────────────────────┐
│  PRE-B (this doc)         │  ◄── architecture needs + tools inventory
│  per Track B feature      │
└─────────────┬─────────────┘
              ▼
Track B (extract, MCP, chat, desks)
```

---

## Step 1 — Name the Track B feature

One row per feature. Do not bundle.

| # | Feature (one sentence) | Pain (measurable) | Track A tried first? |
|---|------------------------|-------------------|----------------------|
| 1 | e.g. Cabinet PDF → quote line items | 2h re-key per quote × N/week | Yes — manual paste in quotation.html |
| 2 | | | |
| 3 | | | |

If **Track A tried first?** is No → stop; build or extend the app screen/API first.

---

## Step 2 — Architecture needs (for this feature)

Answer every row. “TBD” is not allowed to start Track B.

### 2.1 Data & schema

| Need | Status | Notes |
|------|--------|-------|
| Tables AI/tools will **read** | ☐ defined | e.g. `clients`, `leads`, `catalog`, `line_items` |
| Tables AI/tools will **write** | ☐ defined | e.g. `quotation_line_items`, `extract_jobs` |
| New columns / enums required? | ☐ yes / no | List migration |
| File storage bucket (evidence, PDFs)? | ☐ yes / no | Path convention |
| Audit log events to record | ☐ listed | e.g. `extract.completed`, `line_items.confirmed` |

### 2.2 App & API surface (must exist before AI)

Track B **calls the same APIs** as the app — never a parallel write path.

| API / screen | Exists today? | Must build in Track A first? |
|--------------|---------------|------------------------------|
| e.g. `GET /api/quotations/:id` | ☐ | |
| e.g. `POST /api/quotations/:id/line-items` | ☐ | |
| e.g. Review queue UI (confirm rows) | ☐ | **Yes** — extract → confirm always needs a screen |
| e.g. `POST /api/leads` | ☐ | |

### 2.3 Layer checklist ([architecture](./03-architecture.md))

| Layer | Need for this feature |
|-------|----------------------|
| **L1 Governance** | Which roles can extract / confirm / save? Which gates? |
| **L2 Data** | Which entities in the order book chain are touched? |
| **L3 Tools / APIs** | List every tool — see Step 3 |
| **L4 Reasoning** | LLM needed, or rules + OCR only? |
| **L5 Orchestration** | Single prompt enough, or desk split? (default: no) |
| **L6 Experience** | Chat door, app-only review queue, or both? |

### 2.4 Integrations

| Integration | Required? | Owner | Notes |
|-------------|-----------|-------|-------|
| Supabase Storage | ☐ | | PDF upload |
| Email / WhatsApp mirror | ☐ | | Notify only — not source of truth |
| OCR / vision vendor | ☐ | | If not built in-house |
| MCP server host | ☐ | | Where tools are exposed |
| LLM provider (API) | ☐ | | Model name, region, data policy |

### 2.5 Non-functional needs

| Need | Target |
|------|--------|
| Latency (extract job) | e.g. &lt; 60s for 10-page PDF |
| Human review SLA | e.g. rep confirms within same session |
| Cost ceiling | e.g. $X / 1000 pages |
| Arabic / English in documents | Which languages must extract work on? |
| Failure mode | Queue stuck → manual fallback path |

---

## Step 3 — Tools inventory (identify before building AI)

Every Track B feature decomposes into **named tools**. One tool = one action, typed inputs, permission check, one result.

### Tool definition template (copy per tool)

```text
Tool name:     e.g. extract_cabinet_pdf
Purpose:       One sentence
Inputs:        typed list (file_ref, quotation_id, user_id)
Permission:    role(s) allowed
Reads:         tables / storage paths
Writes:        tables (draft only until confirm_* called)
Rules in code: validation, not prompt
Confirm tool:  e.g. confirm_line_items (separate — human gate)
MCP exposed:   yes / no (after API exists)
```

### Starter inventory (IV platform)

Fill **Status** before Track B: `app API` | `needed Track A` | `needed Track B` | `done`

| Tool / API | Track | Inputs (summary) | Permission | Status |
|------------|-------|------------------|------------|--------|
| `create_lead` | A/B | name, phone, source | moderator, rep | |
| `find_client_by_phone` | A/B | phone | rep+ | |
| `assign_lead` | A | lead_id, rep_id | manager | |
| `create_quotation` | A | deal_id | rep | |
| `add_line_item` | A | quotation_id, row | rep | |
| `issue_quotation` | A | quotation_id | rep + discount gate | |
| `extract_cabinet_pdf` | B | file_ref, quotation_id | rep | |
| `confirm_line_items` | B | quotation_id, rows[] | rep | |
| `extract_payment_draft` | B | evidence_ref | accountant | |
| `record_payment` | A | order_id, amount, date | accountant | |
| `confirm_order` | A | order_id | accountant | |
| `notify_ops` | A | order_id, event | system | |

**Rule:** `extract_*` tools write **draft** state only. `confirm_*` / app **Confirm** button writes final state.

### Tools vs screens

| User action | Screen (Track A) | Tool (Track B optional) |
|-------------|------------------|-------------------------|
| Create lead | Lead form | `create_lead` via chat |
| Import PDF rows | Review queue UI | `extract_*` → same queue |
| Confirm payment | Payment form + Confirm | `extract_payment_draft` pre-fill only |

---

## Step 4 — Architecture diagram (one box per feature)

Sketch before coding Track B:

```text
         ┌─────────────┐
User ───►│ L6 Review   │  confirm button (Track A — required)
         │    queue    │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │ extract_*   │  draft job (Track B)
         │   tool      │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │  L2 order   │
         │    book     │
         └─────────────┘
```

No arrow from LLM directly to confirmed financial rows.

---

## Step 5 — Go / no-go checklist

All must be **checked** before starting Track B implementation for this feature:

- [ ] Track A API or screen exists for the **confirmed** write path
- [ ] Review / confirm UI exists (extract → confirm pattern)
- [ ] Tools table above filled — no unnamed “AI will handle it”
- [ ] Schema migrations written for any new tables (`extract_jobs`, etc.)
- [ ] RBAC defined per tool
- [ ] Audit log events listed
- [ ] Sample inputs collected (5 real PDFs, 10 chat intakes, etc.)
- [ ] Success metric defined (e.g. 90% rows correct after one edit)

**No-go examples:**

- “Add ChatGPT to the CRM” — no tools listed
- “MCP first, merge databases later” — violates order book
- Extract writes directly to `payments` without `confirm_payment`

---

## Step 6 — Map to milestones

| Pre-B complete for… | Then start |
|---------------------|------------|
| Chat lead intake | **M1b** — after `create_lead` API + form live |
| Cabinet PDF import | **M2b** — after quotation module + review queue UI |
| Payment extract pre-fill | **M3 + B** — after payment form + `record_payment` |
| Desks / orchestrator | **M5** — after M0–M4 stable + multiple Pre-B sheets |

---

## Related

- [Dual approach](./00-dual-approach.md)
- [Architecture layers](./03-architecture.md)
- [Reasoning & tools](./06-reasoning-and-tools.md)
- [Milestones](./08-milestones.md)
- [Governance — extract → confirm](./07-governance.md)
