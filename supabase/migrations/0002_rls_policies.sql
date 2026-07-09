-- ============================================================================
-- Row Level Security — Role-Based Access Control
--
-- Roles: admin (full access) > manager (full access to CRM data, no user
-- management) > sales_rep (read everything, write only what they own).
-- ============================================================================

-- Helper: read the caller's role without triggering recursive RLS checks on
-- `profiles` (SECURITY DEFINER bypasses RLS for this function body only).
create or replace function public.current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('admin', 'manager');
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin')
  with check (id = auth.uid() or public.current_user_role() = 'admin');

create policy "admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- companies
-- ----------------------------------------------------------------------------
alter table public.companies enable row level security;

create policy "companies readable by authenticated users"
  on public.companies for select to authenticated using (true);

create policy "companies insertable by authenticated users"
  on public.companies for insert to authenticated with check (true);

create policy "companies writable by owner or admin/manager"
  on public.companies for update to authenticated
  using (owner_id = auth.uid() or public.is_admin_or_manager())
  with check (owner_id = auth.uid() or public.is_admin_or_manager());

create policy "companies deletable by owner or admin/manager"
  on public.companies for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin_or_manager());

-- ----------------------------------------------------------------------------
-- leads
-- ----------------------------------------------------------------------------
alter table public.leads enable row level security;

create policy "leads readable by authenticated users"
  on public.leads for select to authenticated using (true);

create policy "leads insertable by authenticated users"
  on public.leads for insert to authenticated with check (true);

create policy "leads writable by assignee or admin/manager"
  on public.leads for update to authenticated
  using (assigned_to = auth.uid() or public.is_admin_or_manager())
  with check (assigned_to = auth.uid() or public.is_admin_or_manager());

create policy "leads deletable by assignee or admin/manager"
  on public.leads for delete to authenticated
  using (assigned_to = auth.uid() or public.is_admin_or_manager());

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
alter table public.customers enable row level security;

create policy "customers readable by authenticated users"
  on public.customers for select to authenticated using (true);

create policy "customers insertable by authenticated users"
  on public.customers for insert to authenticated with check (true);

create policy "customers writable by assignee or admin/manager"
  on public.customers for update to authenticated
  using (assigned_to = auth.uid() or public.is_admin_or_manager())
  with check (assigned_to = auth.uid() or public.is_admin_or_manager());

create policy "customers deletable by assignee or admin/manager"
  on public.customers for delete to authenticated
  using (assigned_to = auth.uid() or public.is_admin_or_manager());

-- ----------------------------------------------------------------------------
-- deals
-- ----------------------------------------------------------------------------
alter table public.deals enable row level security;

create policy "deals readable by authenticated users"
  on public.deals for select to authenticated using (true);

create policy "deals insertable by authenticated users"
  on public.deals for insert to authenticated with check (true);

create policy "deals writable by owner or admin/manager"
  on public.deals for update to authenticated
  using (owner_id = auth.uid() or public.is_admin_or_manager())
  with check (owner_id = auth.uid() or public.is_admin_or_manager());

create policy "deals deletable by owner or admin/manager"
  on public.deals for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin_or_manager());

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
alter table public.tasks enable row level security;

create policy "tasks readable by authenticated users"
  on public.tasks for select to authenticated using (true);

create policy "tasks insertable by authenticated users"
  on public.tasks for insert to authenticated with check (true);

create policy "tasks writable by assignee or admin/manager"
  on public.tasks for update to authenticated
  using (assigned_to = auth.uid() or public.is_admin_or_manager())
  with check (assigned_to = auth.uid() or public.is_admin_or_manager());

create policy "tasks deletable by assignee or admin/manager"
  on public.tasks for delete to authenticated
  using (assigned_to = auth.uid() or public.is_admin_or_manager());

-- ----------------------------------------------------------------------------
-- notes
-- ----------------------------------------------------------------------------
alter table public.notes enable row level security;

create policy "notes readable by authenticated users"
  on public.notes for select to authenticated using (true);

create policy "notes insertable by authenticated users"
  on public.notes for insert to authenticated with check (author_id = auth.uid());

create policy "notes writable by author or admin/manager"
  on public.notes for update to authenticated
  using (author_id = auth.uid() or public.is_admin_or_manager())
  with check (author_id = auth.uid() or public.is_admin_or_manager());

create policy "notes deletable by author or admin/manager"
  on public.notes for delete to authenticated
  using (author_id = auth.uid() or public.is_admin_or_manager());

-- ----------------------------------------------------------------------------
-- activities
-- ----------------------------------------------------------------------------
alter table public.activities enable row level security;

create policy "activities readable by authenticated users"
  on public.activities for select to authenticated using (true);

create policy "activities insertable by authenticated users"
  on public.activities for insert to authenticated with check (created_by = auth.uid());

create policy "activities deletable by author or admin/manager"
  on public.activities for delete to authenticated
  using (created_by = auth.uid() or public.is_admin_or_manager());

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications readable by owner"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "notifications insertable by owner or admin/manager"
  on public.notifications for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin_or_manager());

create policy "notifications updatable by owner"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
