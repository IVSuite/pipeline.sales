# IV AI Workflow Platform — Blueprint (v0.1)

**Prepared for:** IV management and internal build team  
**Prepared by:** Hossary — m@hossaryai.com · hossary@mypend.app  
**Version / date:** v0.1 — July 2026  
**Classification:** Internal

An advisory blueprint for building IV's lead-to-delivery workflow as **AI infrastructure** — one order book, a governed tool layer, and an organization of AI assistants — rather than a traditional ERP application.

---

## 1. Executive summary

The team currently runs its pipeline — lead intake, assignment, follow-up, quotation, payment confirmation, production handoff, and delivery — on **chats, screenshots, and memory**. The objective is to replace memory with a system while keeping a **chat-style interface** the team already knows.

**Recommendation:** Do **not** rebuild a traditional ERP. Build AI infrastructure in the pattern used by leading AI organizations:

- A single governed database (**the order book**)
- A library of small, permission-checked **tools**
- Language-model **assistants** that operate those tools through conversation

Business rules live in **editable instruction documents**, not only in application code. The system is never “finished” by design — it grows tool by tool and skill by skill, at the pace of real needs, built and maintained by **your own team**.

This blueprint defines:

- Target architecture in **six layers**
- An **organization of AI assistants** (desks)
- **Data model** (order book)
- **Reasoning strategy** (no model training)
- **Governance** (human approval gates)
- **Milestone-based delivery** (M0–M5) with acceptance criteria

No fixed timelines or budgets are asserted here. Each milestone is defined by **what demonstrably works when it is done**.

### Core thesis

> **Keep the model ordinary; make the harness excellent.**

All company-specific intelligence lives in the **data**, **instructions**, **tools**, and **skills** built around the model — assets the team owns, edits, and grows.

---

## 2. Vision and guiding principles

**Vision:** Infrastructure, not an application. A traditional ERP fixes workflows into screens designed in advance; the company bends to the software. The recommended approach is three permanent assets — **data, tools, and reasoning** — connected through one chat-first interface. When a new need appears, the response is a **new table and a new tool**, not a new multi-month project.

### Six non-negotiable principles

| # | Principle | Meaning in practice |
|---|-----------|---------------------|
| 1 | **One order book** | Every tool reads from and writes to a single shared database. Client → lead → quote → order → payment → production → delivery is one linked chain. Tools that keep private logs are rejected. |
| 2 | **Humans approve, AI drafts** | No quotation, invoice, manufacturing order, or payment record is finalized by a model alone. A named person confirms; the system logs who and when. |
| 3 | **Extract, then confirm** | Evidence always attached. System may extract to pre-fill; a **named person confirms** before save or gates. Never auto-finalize from images alone. |
| 4 | **Permissions per person, not per bot** | Everyone uses the system under their own identity. Every tool checks who is asking before acting. Role-specific AI assistants are experience design; **security lives in the tool layer**. |
| 5 | **Ordinary model, excellent harness** | No model training or fine-tuning. Company-specific intelligence lives in data, instructions, tools, and skills — assets the team can read and edit. |
| 6 | **Ship small, save skills** | Every increment goes to the team's hands quickly; every refinement is captured as a reusable **skill**. The skill library becomes the company's executable operating manual. |

→ Expanded: [01-vision-and-principles.md](./01-vision-and-principles.md)

---

## 3. Reference architecture (six layers)

| Layer | Name | What it contains |
|-------|------|------------------|
| **L6** | Experience | One chat-first interface; structured forms for repetitive entry; evidence attachments (images, documents). Chat is the main door, not the only door. |
| **L5** | Orchestration | Coordinates every request, identifies intent, routes to the right specialist assistant. |
| **L4** | Reasoning | Language models + skill library. Reasoning shaped by instructions and skills, never by training. Models are swappable; the harness persists. |
| **L3** | Tools & automation | Small, single-purpose, permission-checked scripts via **MCP**. Scheduled and event-triggered automation executes what humans have approved. |
| **L2** | Data | Order book (structured DB), file store for evidence, reference tables (price list, discount sheet, material prices, BOM formulas). |
| **L1** | Governance | Identity and roles, approval gates, append-only audit log (every confirmation, override, correction). |

**Request flow (down):** Person speaks → assistant reasons → tool acts → database changes.  
**Event flow (up):** Confirmed payment → notifications → manufacturing order.

→ Detail: [03-architecture.md](./03-architecture.md)

### Example: how a request travels

Moderator types a new lead into chat. Orchestrator routes to **Sales Desk**. Assistant calls `create_lead` with typed name, phone, source. Tool validates phone, detects existing client, routes to owning rep, returns history. Assistant replies in plain language; audit log records the event. **No screen was pre-designed**; the rule lived in an instruction document and tool validation.

---

## 4. AI workforce (desks)

Assistants structured like an **org chart**, not one all-purpose bot.

| Desk | Serves | Scoped knowledge & tools |
|------|--------|--------------------------|
| **Orchestrator** | Whole system | Routes requests; never acts on data itself |
| **Sales Desk** | Moderator, reps, designer | Leads, dedupe, assignment, follow-up, quotation drafting, discount gates |
| **Finance Desk** | Accountant, sales manager | Payments (extract + confirm + evidence), deposit policy, order confirmation, invoices |
| **Operations Desk** | Operations manager | Manufacturing orders, COGS draft/confirm, production status, material prices |
| **Bridge & Automation** | Whole system | Notifications (in-app + WhatsApp mirror), schedules, delivery booking |

**Security:** Desks are UX/reasoning structure, not security boundaries. Tools check the **human's** role on every call.

→ Detail: [05-ai-workforce.md](./05-ai-workforce.md)

---

## 5. Data architecture (order book)

Data quality is the ceiling on reasoning quality. Chats and screenshots become structured tables; screenshots remain **evidence only**.

Minimum entity chain:

| Entity | Key / link | Notes |
|--------|------------|-------|
| Client | Phone (unique) | B2B/B2C; full history to owning rep |
| Lead | → Client | Source, assigned rep, status, mandatory loss reason |
| Contact record | → Lead | Description, timing, outcome, evidence |
| Quotation | Sequential ID → Lead | Price list only; 1-week validity; expired = new quote, new ID |
| Order | → Quotation | Created only on accountant deposit confirmation |
| Payment | → Order | Typed amount/date; evidence attached |
| Product / price list | Reference | Sole pricing source for quotes |
| Material price table | Effective-dated | Marble, glass, brass, etc. |
| BOM | → Product | Dimension-driven formulas |
| Manufacturing order | → Order | Draft + confirmed COGS; status pipeline |
| Delivery booking | → Order | Zone; full-payment gate on slot confirm |
| User / role | Identity | Moderator, rep, designer, manager, accountant, ops |
| Audit log | Append-only | Every confirmation with identity + timestamp |

→ Detail: [04-data-model.md](./04-data-model.md)

---

## 6. Model and reasoning strategy

### The harness (four components)

| Component | Role |
|-----------|------|
| **Data** | Structured tables via tools. Clean data → precise answers. |
| **Instructions** | Plain-language system prompts: deposit policy, quote validity, gates. |
| **Tools** | Typed inputs, one action, rules in code, permission check. Model asks; tool decides. |
| **Skills** | Saved recipes per task; refinements written back; executable operating manual. |

### Reasoning ladder (climb only when pulled)

| Layer | Mechanism | Adopt when |
|-------|-----------|------------|
| 1 | One system prompt | Day one |
| 2 | Skills per task type | Tasks repeat; refinements accumulate |
| 3 | Orchestrator + per-domain prompts | One prompt can't hold all domains |
| 4 | Different models per specialist | Evidence from live volume/cost/sensitivity (M5) |

### Model sourcing

Start with a **ready-made AI workspace** + **MCP** to the order book. No custom model hosting on day one. Models are replaceable; defer hybrid/local models to **Milestone 5**.

→ Detail: [06-reasoning-and-tools.md](./06-reasoning-and-tools.md)

---

## 7. Tools, integrations, automation

**Tool shape:** name, typed inputs, one action, rules in code, permission check, structured result.  
Example: `record_payment(order_id, amount, date, evidence_ref)` — accountant role only; validates against quote total.

**Integrations:** PDF quotes/invoices, email on order confirm, calendar/delivery, WhatsApp mirror (notifications only), forms (same tools as chat). Future: ETA e-invoicing, Instagram intake.

**Automation:** After human gates — follow-up cadence (0/1/3/7 days), deposit → invoice + MO + notify ops, weekly expiry/unpaid flags. **Chat = judgment; scripts = repetition.**

→ Detail: [06-reasoning-and-tools.md](./06-reasoning-and-tools.md)

---

## 8. Governance

| Gate | Enforcement |
|------|-------------|
| Discount beyond standard sheet | Sales manager approval before quote issued |
| Non-standard deposit (not 60% / 100%) | Logged manager approval |
| Order confirmation | Accountant **confirmed** payment only — rep's word is not enough |
| COGS confirmation | Ops reviews draft; computed + confirmed both logged |
| Delivery release | Full payment required — enforced in booking tool |

**Corrections:** Void and re-issue; never silent edit. Void + replacement linked in audit log.

→ Detail: [07-governance.md](./07-governance.md)

---

## 9. Milestones M0–M5

| Milestone | Done means |
|-----------|------------|
| **M0** | Order book exists; price list, discounts, template digitized; clients imported by phone |
| **M1** | AI workspace + MCP; create/find/assign lead; team uses it daily |
| **M2** | Follow-up engine; quotations with sequential IDs, discount gate, PDF |
| **M3** | Typed payments; quote→order; invoice; ops handoff; void/reissue |
| **M4** | Material prices, BOM, COGS, production status, delivery scheduling |
| **M5** | Orchestrated desks, expanded automation, model-tiering from evidence |

→ Acceptance criteria + mapping to current repos: [08-milestones.md](./08-milestones.md)

---

## 10. Operating model, risks, glossary

- **Roles:** Builder, rules owner, desk champions  
- **Rituals:** Weekly ship + skill capture; “what data + what tool?” not “which app?”

→ [09-operating-model-and-risks.md](./09-operating-model-and-risks.md)  
→ [glossary.md](./glossary.md)

---

## Relation to code in this repo

| Today | Blueprint role |
|-------|------------------|
| `pipeline.sales/` | Shell for L6 experience + L2 CRM tables → extend to full order book |
| `IV-quotation-app/` | Prototype of M2 quotation + catalog → port into unified app as tools/UI |

**Isolation is the anti-pattern.** [02-current-state-and-gap.md](./02-current-state-and-gap.md) explains the gap; [WHATS-NEXT.md](./WHATS-NEXT.md) is the team action list.

---

*IV workflow blueprint v0.1 (July 2026). Split into repo docs for the internal build team.*
