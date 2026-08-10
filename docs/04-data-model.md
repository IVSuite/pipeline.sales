# Data architecture — the order book

**Data quality is the ceiling on reasoning quality.** Chats and screenshots become structured tables. Screenshots remain **evidence attachments only**.

Everything writes to **one order book**. Management reporting is queries, not manual assembly.

---

## Entity chain

```text
Client ──► Lead ──► Contact record(s)
              │
              └──► Quotation ──► Order ──► Payment(s)
                                      │
                                      ├──► Manufacturing order
                                      └──► Delivery booking
```

---

## Core entities

| Entity | Key / link | Rules |
|--------|------------|-------|
| **Client** | Phone number (**unique**) | B2B or B2C; full history visible to owning rep |
| **Lead** | → Client | Source, assigned rep, status; **mandatory loss reason** at loss |
| **Contact record** | → Lead | Request description, timing, outcome; evidence notes or screenshots |
| **Quotation** | Sequential ID → Lead | Prices from **price list only**; validity **one week**; expired quotes are **not** reactivated — new quote, new ID |
| **Order** | → Quotation | Created **only** by accountant deposit confirmation; tax flag; promised delivery date |
| **Payment** | → Order | Extract may pre-fill; **confirmed** amount and date; evidence attached; validated vs quote total |
| **Product / price list** | Reference | Maintained by the team; **sole** pricing source for quotes |
| **Material price table** | Effective-dated | Marble, glass, brass, stainless, execution fees; updated when stock lands |
| **BOM** | → Product | Dimension-driven consumption (e.g. 120 cm lamp vs 80 cm) |
| **Manufacturing order** | → Order | Draft + confirmed COGS logged (quoted vs actual margin); status: queued → in production → QC → done |
| **Delivery booking** | → Order | Zone; promised vs actual date; slot confirmable **only after full payment** |
| **User / role** | Identity | Moderator, sales rep, designer, sales manager, accountant, operations manager |
| **Audit log** | Append-only | Every confirmation, approval, override, correction — identity + timestamp |

---

## Reporting (free once data is unified)

These become SQL queries — not separate projects:

- Unpaid confirmed orders
- Leads by source and conversion
- Loss-reason breakdown
- Lead-to-deposit time
- Quoted vs actual COGS
- Promised vs actual delivery
- Outstanding balances

---

## Mapping from current repos

| Order book entity | `pipeline.sales` today | `IV-quotation-app` today |
|-------------------|------------------------|---------------------------|
| Client | `customers` (partial) | Free-text client line in project |
| Lead | `leads` | — |
| Deal (pipeline view) | `deals` | — |
| Quotation | — | Cloud `projects` JSON |
| Line items | — | Inside project `data` JSON |
| Catalog / price list | — | `catalog` table + `iv-catalog.js` |
| Contact record | `activities` / `notes` | — |
| Payment, Order, MO, Delivery | — | — |

**Merge strategy:** Extend CRM schema with quotation/order/payment tables; migrate project JSON into `quotations` + `line_items`; phone-key clients.

---

## Suggested schema additions (starting point)

Work from `pipeline.sales/supabase/migrations/` and add:

```sql
-- Illustrative — implement in a new migration, not copy-paste blindly

-- clients: enforce phone unique (may merge with customers)
-- quotations: id (sequential human-readable), lead_id, deal_id, status, valid_until, version
-- quotation_line_items: quotation_id, section, code, description, dimensions, qty, price
-- catalog / price_list: shared reference
-- orders, payments, manufacturing_orders, delivery_bookings: M3/M4
-- audit_log: entity_type, entity_id, action, actor_id, payload, created_at
```

Sequential quotation IDs and one-week validity are **business rules** — enforce in tools, not only UI.

---

## Kitchen / IV-specific data (from quotation app)

Preserve when porting:

| Concept | Source | Order book home |
|---------|--------|-----------------|
| Sections (e.g. MAIN KITCHEN) | Project JSON | `quotation_line_items.section` |
| m² rates (base/upper/tall) | Project JSON | `quotation_templates` or rate table |
| Material selection rows | Project JSON | `quotation_materials` |
| Accessories from catalog | `iv-catalog.js` | `catalog` reference table |
| Image groups for PDF | Project JSON | Storage + `quotation_assets` |
| Terms & warranty text | Hardcoded in HTML | `quotation_templates` |

---

## Related

- [Current state & gap](./02-current-state-and-gap.md)
- [Governance gates](./07-governance.md)
- [Milestones M0–M2](./08-milestones.md)
