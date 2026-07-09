# API Documentation

All endpoints live under `/api/*` as Next.js Route Handlers. They run server-side, use the caller's Supabase session (cookie-based), and are subject to Postgres Row Level Security in addition to the checks described below — a request that passes the API's own role check can still be rejected by RLS if the row doesn't belong to the caller.

## Conventions

- **Auth**: every route calls `requireUser()` first. No session → `401 { "error": "Not authenticated" }`.
- **Content type**: send/receive `application/json`.
- **Validation**: request bodies are parsed with [Zod](https://zod.dev). Invalid input → `400`:
  ```json
  { "error": "Validation failed", "issues": [{ "path": "full_name", "message": "Full name is required" }] }
  ```
- **Errors**: unhandled errors → `500 { "error": "Internal server error" }`. Permission errors → `403 { "error": "Insufficient permissions" }`.
- **Pagination** (list endpoints): query params `page` (default 1), `pageSize` (default 20, max 100). Response shape:
  ```json
  { "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
  ```
- **Sorting**: `sortBy` (column name, allow-listed per endpoint) + `sortOrder` (`asc` | `desc`, default varies).
- **Search**: `search` — a case-insensitive substring match against the entity's primary text field(s).

## Companies — `/api/companies`

| Method | Path | Description |
|---|---|---|
| GET | `/api/companies` | List, paginated. Filters: `search` (name), `owner_id`. Sort: `name`, `industry`, `created_at`, `updated_at`. |
| POST | `/api/companies` | Create. Body: `{ name, industry?, website?, phone?, address?, owner_id? }`. `owner_id` defaults to the caller. |
| GET | `/api/companies/:id` | Fetch one, with `owner` embedded. |
| PATCH | `/api/companies/:id` | Partial update. Same shape as POST. |
| DELETE | `/api/companies/:id` | Delete. |

## Leads — `/api/leads`

| Method | Path | Description |
|---|---|---|
| GET | `/api/leads` | List. Filters: `search` (name/email), `status`, `priority`, `assigned_to`, `min_value`, `max_value`, `date_from`, `date_to`. Sort: `full_name`, `deal_value`, `created_at`, `updated_at`, `status`, `priority`. |
| POST | `/api/leads` | Create. Body: `{ full_name, company_id?, email?, phone?, position?, lead_source?, assigned_to?, deal_value?, status?, priority?, notes? }`. `assigned_to` defaults to the caller. Logs a `status_change` activity. |
| GET | `/api/leads/:id` | Fetch one, with `company` and `assignee` embedded. |
| PATCH | `/api/leads/:id` | Partial update. Logs a `status_change` activity if `status` changes. |
| DELETE | `/api/leads/:id` | Delete. |

`status`: `new` \| `contacted` \| `qualified` \| `unqualified` \| `converted`.
`priority`: `low` \| `medium` \| `high` \| `urgent`.

## Customers — `/api/customers`

| Method | Path | Description |
|---|---|---|
| GET | `/api/customers` | List. Filters: `search` (name/email), `assigned_to`, `company_id`. Sort: `full_name`, `created_at`, `updated_at`. |
| POST | `/api/customers` | Create. Body: `{ full_name, email?, phone?, company_id?, assigned_to? }`. |
| GET | `/api/customers/:id` | Fetch one, with `company` and `assignee` embedded. |
| PATCH | `/api/customers/:id` | Partial update. Logs an activity entry. |
| DELETE | `/api/customers/:id` | Delete. |

## Deals — `/api/deals`

| Method | Path | Description |
|---|---|---|
| GET | `/api/deals` | List. Filters: `search` (title), `stage`, `owner_id`, `min_value`, `max_value`. Pass `pageSize=all` to fetch every deal unpaginated (used by the Kanban board). Sort: `title`, `value`, `stage`, `created_at`, `updated_at`, `expected_close_date`. |
| POST | `/api/deals` | Create. Body: `{ title, lead_id?, customer_id?, company_id?, value?, stage?, owner_id?, expected_close_date? }`. |
| GET | `/api/deals/:id` | Fetch one, with `company`, `owner`, `lead`, `customer` embedded. |
| PATCH | `/api/deals/:id` | Partial update — this is what the Kanban board calls with `{ "stage": "..." }` on drop. Logs a `status_change` activity when `stage` changes. |
| DELETE | `/api/deals/:id` | Delete. |

`stage`: `new_lead` \| `contacted` \| `qualified` \| `proposal_sent` \| `negotiation` \| `closed_won` \| `closed_lost`.

## Tasks — `/api/tasks`

| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks` | List. Filters: `search` (title), `status`, `priority`, `assigned_to`, `date_from`/`date_to` (on `due_date`). Sort: `title`, `due_date`, `priority`, `status`, `created_at`. |
| POST | `/api/tasks` | Create. Body: `{ title, description?, due_date?, priority?, status?, assigned_to?, related_lead_id?, related_deal_id?, reminder_at? }`. |
| GET | `/api/tasks/:id` | Fetch one, with `assignee` embedded. |
| PATCH | `/api/tasks/:id` | Partial update. |
| DELETE | `/api/tasks/:id` | Delete. |

`status`: `pending` \| `in_progress` \| `completed` \| `overdue`.

## Notes — `/api/notes`

| Method | Path | Description |
|---|---|---|
| GET | `/api/notes?entity_type=&entity_id=` | List notes for one entity, newest first. `entity_type` is `lead` \| `customer` \| `deal` \| `company`. |
| POST | `/api/notes` | Create. Body: `{ entity_type, entity_id, body }`. Also inserts a matching `note` activity for the timeline. |
| DELETE | `/api/notes/:id` | Delete. |

## Activities — `/api/activities`

| Method | Path | Description |
|---|---|---|
| GET | `/api/activities?entity_type=&entity_id=&limit=` | List activities for one entity (or omit both to get a global recent feed), newest first, `limit` default 20 max 100. |
| POST | `/api/activities` | Log an activity. Body: `{ entity_type, entity_id, type, body? }`. `type` is `note` \| `email` \| `call` \| `meeting` \| `status_change` \| `attachment`. |

## Profiles — `/api/profiles`

| Method | Path | Description |
|---|---|---|
| GET | `/api/profiles` | List all users (id, full_name, email, role) — used to populate assignee dropdowns. |
| PATCH | `/api/profiles/:id` | Admin-only. Body: `{ full_name?, role? }`. Used by the Settings page to change a teammate's role. |

## Search — `/api/search?q=`

Global search across leads, customers, companies, and deals (name/title, top 5 per type). Requires `q` to be at least 2 characters.

```json
{ "results": [{ "id": "...", "label": "Jamie Chen", "sublabel": "jamie@acme.com", "type": "lead" }] }
```

## Dashboard — `/api/dashboard`

Returns the aggregate numbers and lists the dashboard page renders:

```json
{
  "totalLeads": 7,
  "activeDeals": 4,
  "wonDeals": 2,
  "lostDeals": 1,
  "revenue": 60000,
  "monthlySales": [{ "label": "Feb", "value": 0 }, "... 6 months"],
  "recentActivities": [...],
  "upcomingTasks": [...]
}
```
