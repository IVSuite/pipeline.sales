# Operating model and risks

## Operating model

The lasting deliverable is a **capability**, not a one-off codebase.

### Three roles

| Role | Who | Responsibility |
|------|-----|----------------|
| **Builder** | Tech-savvy team member | Writes tools and skills (with model assistance); grows into platform owner |
| **Rules owner** | Manager | Maintains instruction documents as business rules change |
| **Desk champions** | One person per desk | Surfaces friction weekly; validates skills |

### Two rituals

**1. Weekly iteration**

- Something **small ships** every week
- Something **learned** is written into a skill doc

**2. Reframing habit**

When a need appears anywhere in the company, ask:

> **“What data and what tool would this need?”**

Not: “Which app should we buy?”

When that question is default, the AI culture exists — and the platform scales with the company.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Model misreads instruction on financial doc | Human approval gates; strict tool validation; void-and-reissue; audit log |
| Data entered inconsistently | Validated fields (phone = client key); evidence-only screenshots; forms for repetitive entry |
| Team reverts to WhatsApp and memory | Chat-first UX; M1 optimized for habit; WhatsApp **mirror** only during transition |
| Over-engineering early | Reasoning ladder: one prompt → skills → orchestration only when needed |
| Vendor or model lock-in | MCP tool layer + exportable order book; models/interfaces replaceable |
| Sensitive data exposure | Permission on every tool; scoped desk knowledge; local model option at M5 with evidence |
| Key-person dependency on builder | Skills + instructions are plain documents; operating manual **is** the system |
| **Two repos diverging** | Freeze standalone quotation features; merge track owns all new work |
| **Embedded keys in HTML app** | Rotate at M0; env + RLS |

---

## Transition from WhatsApp

WhatsApp stays as **notification mirror**, not system of record:

```text
Order book (truth)  ──event──►  WhatsApp notification
                     ◄──NOT──   auto-finalize payment from screenshot without confirm
```

Train team: review extracted amounts, **confirm** (edit if wrong), attach screenshot as evidence.

---

## Success signals

| Signal | Milestone |
|--------|-----------|
| Rep opens CRM before WhatsApp for lead status | M1 |
| Quote ID referenced in client emails | M2 |
| Accountant refuses to confirm order without system payment row | M3 |
| “Where is my order?” answered without calling ops | M4 |

---

## Related

- [Vision & principles](./01-vision-and-principles.md)
- [Milestones](./08-milestones.md)
- [Governance](./07-governance.md)
