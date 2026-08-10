# Milestones M0–M5

Delivery loop: understand pain → smallest useful increment → build → team uses it → refine.

Milestones split into **Track A (app)** and **Track B (AI)**. **Complete Track A milestones for daily ops before depending on Track B.**

→ [00-dual-approach.md](./00-dual-approach.md)

**No fixed dates.** Each milestone has **acceptance criteria**. Do not start the next until the current one is live and stable.

---

## Overview

| Milestone | Track | Done means (summary) |
|-----------|-------|----------------------|
| **M0** | **A** | One order book; clients, price list, catalog imported |
| **M1** | **A** | Team uses unified **app** daily for leads and deals |
| **M2** | **A** | Quotations + PDF inside CRM; linked to deals |
| **M3** | **A** | Payments, order confirm, invoices — app forms + gates |
| **M4** | **A** | Production, COGS, delivery — app screens + rules |
| **M1b** | **B** | Optional: chat/MCP intake → same APIs as forms |
| **M2b** | **B** | Cabinet/PDF extract → review → confirm into quotes |
| **M5** | **B** | Orchestration, skills library, model tiering if volume requires |

---

## M0 — The data exists (Track A)

### Acceptance criteria

- [ ] Single Supabase project (order book)
- [ ] Price list, discount rules, quotation template in DB
- [ ] Clients imported with **phone as unique key**
- [ ] CRM and quotation modules read/write **same** project (or merge in progress with one dev DB)

### Exit demo

> “Everything about client +20XXXXXXXX” — one query, one admin screen.

---

## M1 — Team uses the app daily (Track A)

**Replaces old “M1 = MCP required”.** AI is optional at M1.

### Acceptance criteria

- [ ] Reps create and update leads/deals in **CRM UI**
- [ ] Assignment and dedupe work via **API + validation** (not WhatsApp)
- [ ] Dashboard reflects live pipeline
- [ ] Team prefers app over spreadsheet/memory for **new** leads

### Optional M1b (Track B)

- [ ] Chat or MCP can call `create_lead` / `find_client` — **same rows as form**
- [ ] Only after form path works

### Exit demo

> New lead entered in CRM → appears on Kanban → assigned rep sees it.

---

## M2 — Sales engine in the app (Track A)

### Acceptance criteria

- [ ] Quotation module inside CRM (ported from `quotation.html`)
- [ ] Deal ↔ quotation link; sequential quote IDs
- [ ] PDF export stored on deal timeline
- [ ] Discount gate in app (manager approve button)

### Optional M2b (Track B)

- [ ] Upload cabinet PDF → extract → **review queue** → confirm rows
- [ ] Low-confidence rows flagged; rep never auto-saves without confirm

### Exit demo

> Open deal → build quote → export PDF → Proposal Sent — **no standalone quotation file**.

---

## M3 — Money and gates (Track A)

### Acceptance criteria

- [ ] Payment screen: amount, date, evidence upload, **Confirm**
- [ ] Extract may pre-fill (Track B) but **confirm** required
- [ ] Order created only on accountant confirm
- [ ] Invoice + ops notification via API/cron (no LLM required)
- [ ] Void-and-reissue flow in app

### Exit demo

> Confirmed deposit → order row → invoice → ops queue.

---

## M4 — Production and delivery (Track A)

### Acceptance criteria

- [ ] Material prices, BOM, COGS draft/confirm in app
- [ ] Production status visible on order
- [ ] Delivery booking with full-payment rule in code
- [ ] “Where is my order?” answered from app

---

## M5 — AI harness deepens (Track B only)

**Only when M0–M4 app track is stable and volume creates friction.**

### Acceptance criteria

- [ ] Desks/orchestrator if one prompt is insufficient
- [ ] Skill library for repeated AI steps (quotation assist, follow-up)
- [ ] Expanded automation (cadence nudges, expiry flags)
- [ ] Model tiering evaluated from **evidence**, not upfront

---

## Map: repos → tracks

```text
pipeline.sales     ──►  Track A shell (M0–M4)
IV-quotation-app   ──►  Port into Track A (M2); extract → Track B (M2b)
WhatsApp           ──►  Mirror only; app is source of truth
Blueprint / MCP    ──►  Track B overlay — not a replacement for M1–M4 screens
```

| Don't | Why |
|-------|-----|
| Block CRM merge waiting for MCP | M1 is app-first |
| Replace payment form with chat | Track A gates need confirm UI |
| Auto-finalize extract to payment | Principle 3 |
| Build orchestrator before forms work | Track B sequence |

---

## Related

- [What's next](./WHATS-NEXT.md)
- [Dual approach](./00-dual-approach.md)
- [Current state & gap](./02-current-state-and-gap.md)
