# Reasoning, tools, and MCP

A language model alone is a **text engine**: no memory, no ability to act, capable of being confidently wrong.

What makes it a reliable worker is the **harness** — everything built around the model. This is where all company-specific intelligence lives.

---

## The harness (four components)

| Component | Role |
|-----------|------|
| **Data** | Structured tables the model reads/writes **only through tools**. Clean data → precise answers; screenshots → guesses. |
| **Instructions** | Plain-language system prompts: who the assistant is, deposit policy, quote validity, delivery gates. **Edit documents, not redeploy monoliths.** |
| **Tools** | Strict scripts: defined inputs, one action, rules in code, permission on every call. **Model asks; tool decides.** |
| **Skills** | Saved recipes per task (quotation skill, follow-up skill, COGS skill). Refinements write back; library = executable operating manual. |

---

## The reasoning ladder

Climb **only when real usage pulls you up**:

| Layer | Mechanism | Adopt when |
|-------|-----------|------------|
| **Layer 1** | One system prompt — single instruction doc, one assistant | **Day one** — intake, assignment, follow-up |
| **Layer 2** | Skills — each task type has its own recipe and thinking steps | Tasks repeat; refinements accumulate |
| **Layer 3** | Orchestrator + per-domain prompts (desk structure) | One prompt can't hold all domains cleanly |
| **Layer 4** | Different models per specialist (light intake, strong finance, optional local for sensitive paths) | **M5 only** — evidence from live volume, cost, sensitivity |

**Do not skip to Layer 3–4.** Most teams stay on 1–2 for months.

---

## Model sourcing

**Start:**

- Ready-made **AI workspace** (Cursor, Claude desktop, or similar)
- Connected to order book via **MCP** (Model Context Protocol)
- **No** custom model hosting on day one
- **No** interface built from scratch for AI on day one

**Later (M5):**

- Hybrid cloud + local model for sensitive financial paths
- Decision from **operational evidence**, not upfront guesses

Because capabilities live in the **tool layer**, swapping models does not require rebuild.

---

## Anatomy of a tool

Every tool follows one shape:

| Part | Requirement |
|------|-------------|
| Name | Verb-noun, e.g. `record_payment` |
| Inputs | Strictly typed (order ID, amount, date, evidence ref) |
| Action | **One** mutation or query |
| Rules | Enforced in **code** (not hope the model remembers) |
| Permission | Role check on every call |
| Result | Structured JSON the model can read |

**Example — payment flow (extract → confirm):**

1. `extract_payment_draft(evidence_ref)` — OCR/vision pre-fills amount, date, reference into a **draft** (no DB write)
2. Accountant reviews in UI — edits if needed — taps **Confirm**
3. `record_payment(order_id, amount, date, evidence_ref, confirmed_by)` — only after confirm; validates vs quote total; audit log

The model may call step 1; only the accountant (via confirmed tool call) executes step 3.

CRM API routes in `pipeline.sales` are proto-tools. Refactor toward MCP-exposed tools shared by chat and UI.

---

## MCP (Model Context Protocol)

**Plain meaning:** A standard plug for tools — like USB for AI. Build a tool once; any modern AI interface can use it.

**Build order:**

1. Order book tables (M0)
2. Server-side tools wrapping Supabase (M1)
3. MCP server exposing those tools (M1)
4. Connect AI workspace (M1)

---

## Integration catalogue

| Connection | Purpose | Phase |
|------------|---------|-------|
| **Document generation** | Quotation template + invoices → PDF | M2 — port from `quotation.html` |
| **Email** | Invoices and down-payment records to accountant on order confirm | M3 |
| **Calendar / delivery** | Slots, zone batching, full-payment gate | M4 |
| **Messaging mirror** | System events → WhatsApp notifications; **system stays source of truth** | M1+ transition |
| **Forms** | Lead form, payment form → same tools as chat | M1 — `pipeline.sales` forms |
| **ETA e-invoicing** | B2B tax-flagged orders | Future increment |
| **Instagram intake** | API lead capture | Future; manual typed intake default until proven |

### Cabinet / price list import (from IV quotation app)

Today: browser parsing in `quotation.html`.

Target: **server tool** — extract → **review queue** → rep confirms rows — same pattern as payment confirm, not inline auto-save in HTML.

---

## Automation

**Humans approve; automation executes.**

| Trigger | Automated actions (after gate) |
|---------|-------------------------------|
| Daily schedule | Surface due follow-ups (0/1/3/7 cadence), deferrals, 6-month revival |
| Deposit confirmed | Issue invoice, create manufacturing order, notify operations |
| Weekly schedule | Quotes nearing expiry, unpaid confirmed orders, unreachable leads |

**Chat = judgment. Scripts = repetition.**

Anything deterministic after an approved event should be a **script** calling the same tools as chat.

---

## Skills — where to store them

Create a folder in the unified repo (suggested):

```text
skills/
  sales-intake.md
  quotation-kitchen.md
  follow-up-cadence.md
  record-payment.md
  ...
```

Each skill: when to use, steps, fields to collect, which tools to call, edge cases learned in production.

---

## Related

- [Architecture](./03-architecture.md)
- [Governance](./07-governance.md)
- [Glossary — Tool, Skill, MCP](./glossary.md)
