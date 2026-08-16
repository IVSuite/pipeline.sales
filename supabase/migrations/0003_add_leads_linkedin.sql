-- ============================================================================
-- Add a LinkedIn column to leads (for the Leads bulk-import feature).
-- Additive and non-destructive: no existing rows or data are modified.
-- Approved for production `public.leads`. NOT auto-applied — run this once
-- against the production project before/at deploy of the Leads importer.
-- ============================================================================

alter table public.leads
  add column if not exists linkedin text;
