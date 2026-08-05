# Vision and guiding principles

## Vision

**Infrastructure, not an application.**

A traditional ERP fixes workflows into screens designed months in advance. The company then bends to the software.

The recommended approach:

```text
DATA  +  TOOLS  +  REASONING  ──►  one chat-first interface
```

When a new need appears, the response is a **new table and a new tool** — not a new six-month project.

---

## Six principles (non-negotiable)

Every design decision must pass these. If a feature violates one, reject or redesign it.

### 1. One order book

- Every tool reads from and writes to **one shared database**.
- Client, lead, quote, order, payment, production, and delivery form **one linked record chain**.
- Tools that keep private logs or separate stores are **rejected**.

**For the IV repo today:** `IV-quotation-app` and `pipeline.sales` each use their own Supabase project. That violates principle 1. Merge is required.

---

### 2. Humans approve, AI drafts

- No quotation, invoice, manufacturing order, or payment is **finalized by a model alone**.
- A **named person** confirms.
- The system logs **who** and **when**.

---

### 3. Extract, then confirm

- Screenshots and documents are always stored as **evidence** on the record.
- The system **may extract** amounts, dates, phones, and line items to **pre-fill** fields — faster than re-typing from scratch.
- A **named person must confirm** before anything is saved or triggers a gate (payment → order, delivery release, quote issued).
- **Never auto-finalize:** extracted values do not write straight to confirmed records. No “machine read it, so it’s true.”

```text
Upload  →  Extract (draft)  →  Human confirms or edits  →  Tool saves  →  Audit log
                ↑                                              ↑
           evidence kept                                 who + when
```

**Why not re-type only?** Wastes time when OCR/vision can pre-fill accurately enough to review.

**Why not extract-only?** Bank receipts and WhatsApp screenshots are noisy; wrong digits on payments or orders are costly; someone must own the confirmed number.

**Why this fits principle 2:** AI drafts the fields; the accountant (or rep) confirms. The attachment stays proof; the confirmed fields are what the system acts on.

---

### 4. Permissions per person, not per bot

- Everyone logs in as **themselves**.
- Every tool checks **who is asking** before acting.
- “Sales Desk assistant” is UX; **security is in the tool layer**.

`pipeline.sales` already has roles (`admin`, `manager`, `sales_rep`). Extend the same pattern to quotation and payment tools.

---

### 5. Ordinary model, excellent harness

- **No model training or fine-tuning** required.
- Intelligence lives in:
  - structured **data**
  - editable **instructions** (system prompts)
  - permission-checked **tools**
  - reusable **skills**

The team can read and change these without a full redeploy.

---

### 6. Ship small, save skills

- Every increment reaches the **team's hands quickly**.
- Every refinement becomes a **reusable skill** (a saved recipe the model loads for that job).
- The skill library = the company's **executable operating manual**.

**Weekly habit:** Something small ships; something learned is written into a skill doc.

---

## What this means for builders

| Old habit | New habit |
|-----------|-----------|
| “Add a tab to quotation.html” | “What table and tool does this need in the order book?” |
| “CRM and quotes are separate products” | “Quote is a record linked to lead/deal” |
| “WhatsApp is faster” | “Chat UI writes to the same tools as forms” |
| “Big bang ERP go-live” | “M0, then M1, then M2 — each with acceptance tests” |

---

## Related

- [What's next](./WHATS-NEXT.md)
- [Architecture](./03-architecture.md)
- [Milestones](./08-milestones.md)
