# Vision and guiding principles

## Vision

**Two tracks, one order book.**

Most of the business runs on a **simple app** — forms, screens, database, rules. That is what `pipeline.sales` and the quotation builder are for. **Keep building that** wherever it is already usable.

The **blueprint and AI layer** are for what the app **cannot** do well alone, or for **on-top tools** that make the app faster, more accurate, or scalable (document extract → confirm, chat intake, follow-up intelligence, cross-record assist).

```text
Track A — App (primary)          Track B — AI (overlay)
────────────────────────         ──────────────────────
CRM · quotes · payments          LLM · MCP · extract→confirm
Next.js + Supabase               Same database, same APIs
Ship weekly, team uses daily     Add when app hits a wall
```

When a need is structured → **new table + screen**. When it is messy or scales badly manually → **tool + optional LLM**. Not everything through chat.

→ Full decision guide: [00-dual-approach.md](./00-dual-approach.md)

---

## Six principles (non-negotiable)

Every design decision must pass these. If a feature violates one, reject or redesign it.

### 1. One order book

- Every app screen and every AI tool reads from and writes to **one shared database**.
- Client, lead, quote, order, payment, production, and delivery form **one linked record chain**.
- Tools or apps that keep private logs or separate stores are **rejected**.

**For the IV repo today:** `IV-quotation-app` and `pipeline.sales` each use their own Supabase project. That violates principle 1. Merge is required.

---

### 2. Humans approve, AI drafts

- Applies to **Track B** and to any AI-assisted step in **Track A** (e.g. extract → confirm).
- No quotation, invoice, manufacturing order, or payment is **finalized by a model alone**.
- A **named person** confirms in the app or via a confirm action.
- The system logs **who** and **when**.

Pure app flows (dropdown stage change, typed payment with confirm button) still log the user — no AI required.

---

### 3. Extract, then confirm

- Screenshots and documents are always stored as **evidence** on the record.
- The system **may extract** amounts, dates, phones, and line items to **pre-fill** fields.
- A **named person must confirm** before anything is saved or triggers a gate.
- **Never auto-finalize:** extracted values do not write straight to confirmed records.

```text
Upload  →  Extract (draft)  →  Human confirms or edits  →  App/tool saves  →  Audit log
```

This is the main pattern for **Track B** on documents and payments. **Track A** can skip extraction when the user types directly into a form.

---

### 4. Permissions per person, not per bot

- Everyone logs in as **themselves**.
- Every API route and MCP tool checks **who is asking** before acting.
- AI assistants are a **second door** into the same permissions — not a bypass.

`pipeline.sales` already has roles (`admin`, `manager`, `sales_rep`). Extend the same pattern to quotation and payment modules.

---

### 5. App first; ordinary model when needed

- **Default:** solve with database + app UI + validation.
- **When that fails or scales poorly:** add LLM harness (instructions, tools, skills).
- **No model training or fine-tuning** required for either track.

Intelligence for messy work lives in extract → confirm, tools, and skills — not in replacing the CRM with chat.

---

### 6. Ship small, save what works

- **Track A:** ship app increments the team uses daily (M0, M2, M3…).
- **Track B:** capture refinements as **skills** when AI steps repeat.
- Do not block app delivery waiting for MCP, orchestrator, or chat.

**Weekly habit:** Ship something on the app track; add AI only where the team still feels friction.

---

## What this means for builders

| Old habit | New habit |
|-----------|-----------|
| “Everything through chat / AI” | “Form + DB first; AI for messy or scale gaps” |
| “Replace quotation.html with agents” | “Port quotation into CRM; AI assists import only” |
| “CRM and quotes are separate products” | “Quote is a record linked to lead/deal” |
| “Big bang ERP or big bang AI” | “M0 app merge, then M2 quotes, then extract queue” |

---

## Related

- [Dual approach](./00-dual-approach.md)
- [What's next](./WHATS-NEXT.md)
- [Architecture](./03-architecture.md)
- [Milestones](./08-milestones.md)
