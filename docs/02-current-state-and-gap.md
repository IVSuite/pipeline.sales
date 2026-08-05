# Current state and gap

This page maps **what is in the repo today** to **what the blueprint requires**, so the team knows exactly why isolation must end.

---

## Assets in this repo

### `IV-quotation-app/` — Quotation builder

| Capability | Location | Blueprint layer |
|------------|----------|-------------------|
| Quotation editor (sections, line items, materials) | `quotation.html` | L6 Experience (partial) |
| PDF export / preview | `quotation.html` | L3 Tool + integration |
| Accessories catalog | `iv-catalog.js` | L2 Data (reference table) |
| Cabinet / Excel / PDF import | `quotation.html` (browser) | L3 Tool (should move server-side) |
| Cloud projects + catalog sync | Supabase (project A) | L2 Data — **separate DB** |
| Team sharing | `CLOUD-SETUP.md`, embedded keys | Violates L1 Governance (rotate keys on merge) |

**Strengths:** Fast for power users; rich PDF; domain logic for kitchen quotes (m² rates, materials page, terms).

**Gaps vs order book:** No client phone key; no lead/deal link; no sequential quote IDs; no discount gates; no payment or production chain.

---

### `pipeline.sales/` — Pipeline CRM

| Capability | Location | Blueprint layer |
|------------|----------|-------------------|
| Auth + RBAC | Supabase Auth + `lib/rbac.ts` | L1 Governance (partial) |
| Leads, companies, customers, deals | `supabase/migrations/0001_init.sql` | L2 Data (partial — no quote/order) |
| Kanban pipeline | `components/kanban/` | L6 Experience |
| Tasks, notes, activities | API routes + UI | L2 + L6 |
| Dashboard KPIs | `app/(dashboard)/dashboard/` | L6 Experience |
| Demo seed data | `supabase/seed.sql` | Replace with real clients at M0 |

**Strengths:** Modern app shell; roles; pipeline stages align with **early** sales desk needs.

**Gaps vs order book:** No quotation entity; no payments; no manufacturing/delivery; **different Supabase project** from quotation app.

---

## The isolation problem (visual)

```text
                    TODAY
    ┌─────────────────────────────────────────────────┐
    │  WhatsApp · screenshots · memory (source of     │
    │  truth for payments, follow-ups, context)       │
    └───────────────────────┬─────────────────────────┘
                            │ manual
            ┌───────────────┴───────────────┐
            ▼                               ▼
   pipeline.sales                    IV-quotation-app
   Supabase B                       Supabase A
   leads · deals                    projects · catalog
   NO quote_id                      NO deal_id
```

```text
                    TARGET (principle 1)
    ┌─────────────────────────────────────────────────┐
    │  L6: Chat + forms + CRM UI  ──►  same tools     │
    └───────────────────────┬─────────────────────────┘
                            ▼
    ┌─────────────────────────────────────────────────┐
    │  L2: ONE order book                             │
    │  client → lead → contact → quote → order →      │
    │  payment → MO → delivery                        │
    └─────────────────────────────────────────────────┘
```

---

## Feature overlap and conflict

| Concern | Quotation app | CRM | Unified approach |
|---------|---------------|-----|------------------|
| Client name | Free text in project | `customers` / `companies` | **Client** table, phone unique key |
| Project / deal | “Cloud project” | `deals` | **Lead** + **Quotation** linked to deal |
| Catalog / price list | `catalog` + `iv-catalog.js` | — | Single **price list** reference table |
| PDF sent to client | Export from browser | — | Stored on **Quotation** + activity on deal |
| Who edited what | Last save wins | Activity log | **Audit log** (L1) + quote versions |
| Permissions | Open team policy in cloud setup | RLS by role | One RLS model on order book |

---

## What to keep vs port vs retire

| Keep concept | Port from | Into |
|--------------|-----------|------|
| Quotation UI layout | `quotation.html` | React pages in unified app |
| Catalog items | `iv-catalog.js` | `catalog` / price list seed script |
| CRM shell, Kanban, auth | `pipeline.sales` | Unified app base |
| Deal stages | `pipeline.sales` | Map to Sales Desk workflow |
| Browser-only PDF import | `quotation.html` | Phase 2 **tool** (async, review queue) |

| Retire eventually |
|-------------------|
| Standalone `quotation.html` as primary UI |
| Second Supabase project |
| Embedded anon keys in HTML |
| Duplicate client entry across apps |

---

## Minimum merge (technical checklist)

- [ ] One Supabase project for dev/staging/prod
- [ ] `clients.phone` unique; migrate known clients
- [ ] `quotations` linked to `leads` or `deals`
- [ ] `deals.quotation_id` or junction table
- [ ] Catalog tables merged; seed from `iv-catalog.js`
- [ ] PDF artifact in Storage + metadata row
- [ ] Env-based keys; RLS on all tables
- [ ] Audit log table (append-only)

---

## Related

- [What's next — immediate steps](./WHATS-NEXT.md)
- [Data model](./04-data-model.md)
- [Milestones — repo mapping](./08-milestones.md)
