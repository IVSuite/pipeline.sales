-- ============================================================================
-- Sales Pipeline CRM — Initial Schema
-- Run against a Supabase Postgres project (SQL Editor or `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'manager', 'sales_rep');
create type lead_status as enum ('new', 'contacted', 'qualified', 'unqualified', 'converted');
create type priority_level as enum ('low', 'medium', 'high', 'urgent');
create type deal_stage as enum (
  'new_lead',
  'contacted',
  'qualified',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost'
);
create type task_status as enum ('pending', 'in_progress', 'completed', 'overdue');
create type activity_type as enum ('note', 'email', 'call', 'meeting', 'status_change', 'attachment');
create type entity_type as enum ('lead', 'customer', 'deal', 'company');
create type notification_type as enum (
  'deal_stage_changed',
  'task_overdue',
  'lead_assigned',
  'customer_updated'
);

-- ----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'sales_rep',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- companies
-- ----------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  website text,
  phone text,
  address text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_owner_id_idx on public.companies(owner_id);
create index companies_name_idx on public.companies using gin (to_tsvector('english', name));

-- ----------------------------------------------------------------------------
-- leads
-- ----------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_id uuid references public.companies(id) on delete set null,
  email text,
  phone text,
  position text,
  lead_source text,
  assigned_to uuid references public.profiles(id) on delete set null,
  deal_value numeric(14, 2) default 0 check (deal_value >= 0),
  status lead_status not null default 'new',
  priority priority_level not null default 'medium',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_company_id_idx on public.leads(company_id);
create index leads_assigned_to_idx on public.leads(assigned_to);
create index leads_status_idx on public.leads(status);
create index leads_priority_idx on public.leads(priority);
create index leads_created_at_idx on public.leads(created_at desc);
create index leads_search_idx on public.leads using gin (
  to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(email, ''))
);

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company_id uuid references public.companies(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  converted_from_lead_id uuid references public.leads(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_company_id_idx on public.customers(company_id);
create index customers_assigned_to_idx on public.customers(assigned_to);
create index customers_search_idx on public.customers using gin (
  to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(email, ''))
);

-- ----------------------------------------------------------------------------
-- deals
-- ----------------------------------------------------------------------------
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  value numeric(14, 2) not null default 0 check (value >= 0),
  stage deal_stage not null default 'new_lead',
  owner_id uuid references public.profiles(id) on delete set null,
  expected_close_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_stage_idx on public.deals(stage);
create index deals_owner_id_idx on public.deals(owner_id);
create index deals_company_id_idx on public.deals(company_id);
create index deals_created_at_idx on public.deals(created_at desc);

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date timestamptz,
  priority priority_level not null default 'medium',
  status task_status not null default 'pending',
  assigned_to uuid references public.profiles(id) on delete set null,
  related_lead_id uuid references public.leads(id) on delete cascade,
  related_deal_id uuid references public.deals(id) on delete cascade,
  reminder_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_status_idx on public.tasks(status);
create index tasks_related_lead_id_idx on public.tasks(related_lead_id);
create index tasks_related_deal_id_idx on public.tasks(related_deal_id);

-- ----------------------------------------------------------------------------
-- notes (polymorphic, attached to lead/customer/deal/company)
-- ----------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  entity_type entity_type not null,
  entity_id uuid not null,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_entity_idx on public.notes(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- activities (timeline: emails, calls, meetings, status changes, notes)
-- ----------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  entity_type entity_type not null,
  entity_id uuid not null,
  type activity_type not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index activities_entity_idx on public.activities(entity_type, entity_id);
create index activities_created_at_idx on public.activities(created_at desc);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  message text not null,
  entity_type entity_type,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_is_read_idx on public.notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.deals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-create profile row when a new auth user signs up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'sales_rep')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
