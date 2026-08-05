# Glossary

Plain-language definitions for the IV AI workflow platform.

| Term | Plain meaning |
|------|----------------|
| **LLM (language model)** | A text engine: send it words, it sends words back. No memory of its own; cannot act without tools; can be confidently wrong. |
| **Harness** | Everything built around the model — data, instructions, tools, skills. Where all company-specific intelligence lives. |
| **System prompt** | The written instruction document that defines an assistant's identity, rules, and behavior. |
| **Tool** | A small, single-purpose, permission-checked script the model is allowed to call. The model asks; the tool decides. |
| **Skill** | A saved recipe the model loads for a specific job; the unit in which team know-how is captured and reused. |
| **MCP** | Model Context Protocol — a standard plug format for tools, like USB for AI. Build a tool once; any modern AI interface can use it. |
| **Orchestrator** | A coordinating layer that routes each request to the right specialist assistant. |
| **Desk / agent** | A specialist assistant: same or different model under its own system prompt, knowledge scope, and tool set. |
| **Order book** | The single shared database: the linked chain from client to lead, quote, order, payment, production, and delivery. |
| **Approval gate** | A point where a named human must confirm before a record is finalized; always logged with identity and time. |
| **Evidence attachment** | Screenshot or document on the record — proof for audit |
| **Extract → confirm** | System pre-fills from image/PDF; human confirms before save — never auto-finalize |
| **Void and re-issue** | Correction pattern: cancel wrong confirmed record, create replacement, link both in audit log. |
| **COGS** | Cost of goods sold — computed from BOM × material prices; draft then confirmed by operations. |
| **BOM** | Bill of materials — dimension-driven formulas for what materials a product consumes. |
| **Reasoning ladder** | Layer 1 (one prompt) → skills → orchestration → multi-model; climb only when usage demands. |

---

## Repo-specific terms

| Term | Meaning |
|------|---------|
| **IV-quotation-app** | Standalone browser quotation builder in this repo — to be **ported**, not maintained forever alone. |
| **pipeline.sales** | Next.js CRM in this repo — **shell** for unified platform after M0 merge. |
| **Cloud project** | Legacy quotation app term for a saved quote JSON — becomes **`quotations`** row in order book. |

---

## Related

- [Blueprint (full)](./BLUEPRINT.md)
- [Reasoning and tools](./06-reasoning-and-tools.md)
