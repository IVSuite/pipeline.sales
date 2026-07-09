-- ============================================================================
-- Seed data — run AFTER 0001_init.sql and 0002_rls_policies.sql.
-- Creates 4 auth users (admin/manager/2 reps, password: Password123!) plus
-- companies, leads, customers, deals across all 7 pipeline stages, tasks,
-- notes and activities so the dashboard/board are populated on first login.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users (auth.users insert triggers public.handle_new_user -> profiles row)
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'admin@demo.com',
   extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ava Admin","role":"admin"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'manager@demo.com',
   extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Mona Manager","role":"manager"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated', 'rep1@demo.com',
   extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Rico Rep","role":"sales_rep"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004',
   'authenticated', 'authenticated', 'rep2@demo.com',
   extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Sara Sales","role":"sales_rep"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- Matching identities row (Supabase requires this for password auth to work)
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, created_at, updated_at
) values
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@demo.com"}', 'email', now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
   '{"sub":"a0000000-0000-0000-0000-000000000002","email":"manager@demo.com"}', 'email', now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003',
   '{"sub":"a0000000-0000-0000-0000-000000000003","email":"rep1@demo.com"}', 'email', now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004',
   '{"sub":"a0000000-0000-0000-0000-000000000004","email":"rep2@demo.com"}', 'email', now(), now())
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Companies
-- ----------------------------------------------------------------------------
insert into public.companies (id, name, industry, website, phone, address, owner_id) values
  ('c0000000-0000-0000-0000-000000000001', 'Northwind Traders', 'Retail', 'https://northwind.example', '555-0101', '123 Market St, Austin, TX', 'a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000002', 'Globex Manufacturing', 'Manufacturing', 'https://globex.example', '555-0102', '45 Industrial Way, Detroit, MI', 'a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000003', 'Initech Software', 'Technology', 'https://initech.example', '555-0103', '9 Innovation Dr, Austin, TX', 'a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000004', 'Umbrella Health', 'Healthcare', 'https://umbrella.example', '555-0104', '77 Wellness Blvd, Raleigh, NC', 'a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000005', 'Stark Energy', 'Energy', 'https://starkenergy.example', '555-0105', '1 Reactor Rd, Malibu, CA', 'a0000000-0000-0000-0000-000000000002');

-- ----------------------------------------------------------------------------
-- Leads
-- ----------------------------------------------------------------------------
insert into public.leads (id, full_name, company_id, email, phone, position, lead_source, assigned_to, deal_value, status, priority, notes, created_by) values
  ('e0000000-0000-0000-0000-000000000001', 'Jamie Chen', 'c0000000-0000-0000-0000-000000000001', 'jamie.chen@northwind.example', '555-0201', 'VP Sales', 'Website', 'a0000000-0000-0000-0000-000000000003', 24000, 'contacted', 'high', 'Met at trade show, very interested in the enterprise plan.', 'a0000000-0000-0000-0000-000000000003'),
  ('e0000000-0000-0000-0000-000000000002', 'Priya Nair', 'c0000000-0000-0000-0000-000000000002', 'priya.nair@globex.example', '555-0202', 'Procurement Lead', 'Referral', 'a0000000-0000-0000-0000-000000000004', 58000, 'qualified', 'urgent', 'Needs a proposal by end of month.', 'a0000000-0000-0000-0000-000000000004'),
  ('e0000000-0000-0000-0000-000000000003', 'Tom Alvarez', 'c0000000-0000-0000-0000-000000000003', 'tom.alvarez@initech.example', '555-0203', 'CTO', 'Cold Call', 'a0000000-0000-0000-0000-000000000003', 12000, 'new', 'medium', null, 'a0000000-0000-0000-0000-000000000003'),
  ('e0000000-0000-0000-0000-000000000004', 'Laura Kim', 'c0000000-0000-0000-0000-000000000004', 'laura.kim@umbrella.example', '555-0204', 'Director of Ops', 'LinkedIn', 'a0000000-0000-0000-0000-000000000004', 34500, 'contacted', 'medium', 'Wants a demo of the reporting module.', 'a0000000-0000-0000-0000-000000000004'),
  ('e0000000-0000-0000-0000-000000000005', 'Derek Osei', 'c0000000-0000-0000-0000-000000000005', 'derek.osei@starkenergy.example', '555-0205', 'Head of Procurement', 'Event', 'a0000000-0000-0000-0000-000000000002', 92000, 'qualified', 'urgent', 'Big opportunity, exec sponsor engaged.', 'a0000000-0000-0000-0000-000000000002'),
  ('e0000000-0000-0000-0000-000000000006', 'Nina Petrova', 'c0000000-0000-0000-0000-000000000001', 'nina.petrova@northwind.example', '555-0206', 'IT Manager', 'Website', 'a0000000-0000-0000-0000-000000000003', 8000, 'unqualified', 'low', 'Budget too small this year.', 'a0000000-0000-0000-0000-000000000003'),
  ('e0000000-0000-0000-0000-000000000007', 'Owen Baxter', 'c0000000-0000-0000-0000-000000000003', 'owen.baxter@initech.example', '555-0207', 'VP Engineering', 'Referral', 'a0000000-0000-0000-0000-000000000003', 45000, 'converted', 'high', 'Signed! Converted to customer.', 'a0000000-0000-0000-0000-000000000003');

-- ----------------------------------------------------------------------------
-- Customers (some converted from leads, some direct)
-- ----------------------------------------------------------------------------
insert into public.customers (id, full_name, email, phone, company_id, assigned_to, converted_from_lead_id, created_by) values
  ('f0000000-0000-0000-0000-000000000001', 'Owen Baxter', 'owen.baxter@initech.example', '555-0207', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000002', 'Grace Lin', 'grace.lin@globex.example', '555-0301', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', null, 'a0000000-0000-0000-0000-000000000004'),
  ('f0000000-0000-0000-0000-000000000003', 'Marcus Webb', 'marcus.webb@umbrella.example', '555-0302', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', null, 'a0000000-0000-0000-0000-000000000002');

-- ----------------------------------------------------------------------------
-- Deals — at least one per pipeline stage, several in active stages
-- ----------------------------------------------------------------------------
insert into public.deals (id, title, lead_id, customer_id, company_id, value, stage, owner_id, expected_close_date, created_by) values
  ('d0000000-0000-0000-0000-000000000001', 'Northwind — Trial Expansion', 'e0000000-0000-0000-0000-000000000001', null, 'c0000000-0000-0000-0000-000000000001', 24000, 'new_lead', 'a0000000-0000-0000-0000-000000000003', current_date + interval '30 day', 'a0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000002', 'Globex — Procurement Deal', 'e0000000-0000-0000-0000-000000000002', null, 'c0000000-0000-0000-0000-000000000002', 58000, 'contacted', 'a0000000-0000-0000-0000-000000000004', current_date + interval '21 day', 'a0000000-0000-0000-0000-000000000004'),
  ('d0000000-0000-0000-0000-000000000003', 'Initech — Platform Rollout', 'e0000000-0000-0000-0000-000000000003', null, 'c0000000-0000-0000-0000-000000000003', 12000, 'qualified', 'a0000000-0000-0000-0000-000000000003', current_date + interval '14 day', 'a0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000004', 'Umbrella — Reporting Suite', 'e0000000-0000-0000-0000-000000000004', null, 'c0000000-0000-0000-0000-000000000004', 34500, 'proposal_sent', 'a0000000-0000-0000-0000-000000000004', current_date + interval '10 day', 'a0000000-0000-0000-0000-000000000004'),
  ('d0000000-0000-0000-0000-000000000005', 'Stark Energy — Enterprise Contract', 'e0000000-0000-0000-0000-000000000005', null, 'c0000000-0000-0000-0000-000000000005', 92000, 'negotiation', 'a0000000-0000-0000-0000-000000000002', current_date + interval '7 day', 'a0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000006', 'Initech — Onboarding Package', null, 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 45000, 'closed_won', 'a0000000-0000-0000-0000-000000000003', current_date - interval '5 day', 'a0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000007', 'Northwind — Legacy Migration', 'e0000000-0000-0000-0000-000000000006', null, 'c0000000-0000-0000-0000-000000000001', 8000, 'closed_lost', 'a0000000-0000-0000-0000-000000000003', current_date - interval '12 day', 'a0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000008', 'Globex — Support Add-on', null, 'f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 15000, 'closed_won', 'a0000000-0000-0000-0000-000000000004', current_date - interval '2 day', 'a0000000-0000-0000-0000-000000000004'),
  ('d0000000-0000-0000-0000-000000000009', 'Umbrella — Second Site License', null, 'f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 27500, 'negotiation', 'a0000000-0000-0000-0000-000000000002', current_date + interval '18 day', 'a0000000-0000-0000-0000-000000000002');

-- ----------------------------------------------------------------------------
-- Tasks
-- ----------------------------------------------------------------------------
insert into public.tasks (title, description, due_date, priority, status, assigned_to, related_lead_id, related_deal_id, reminder_at, created_by) values
  ('Follow up call with Jamie Chen', 'Discuss enterprise pricing tiers.', now() + interval '2 day', 'high', 'pending', 'a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', now() + interval '1 day', 'a0000000-0000-0000-0000-000000000003'),
  ('Send proposal to Globex', 'Finalize procurement proposal doc.', now() + interval '1 day', 'urgent', 'in_progress', 'a0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', now() + interval '12 hour', 'a0000000-0000-0000-0000-000000000004'),
  ('Demo prep for Umbrella Health', 'Prepare reporting module walkthrough.', now() - interval '1 day', 'medium', 'overdue', 'a0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', null, 'a0000000-0000-0000-0000-000000000004'),
  ('Contract review with legal', 'Stark Energy enterprise contract redlines.', now() + interval '3 day', 'urgent', 'pending', 'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', now() + interval '2 day', 'a0000000-0000-0000-0000-000000000002'),
  ('Onboarding kickoff', 'Schedule kickoff call with Owen Baxter.', now() + interval '4 day', 'medium', 'pending', 'a0000000-0000-0000-0000-000000000003', null, 'd0000000-0000-0000-0000-000000000006', null, 'a0000000-0000-0000-0000-000000000003'),
  ('Quarterly check-in', 'Check in with Grace Lin on usage.', now() + interval '6 day', 'low', 'pending', 'a0000000-0000-0000-0000-000000000004', null, null, null, 'a0000000-0000-0000-0000-000000000004'),
  ('Qualify Tom Alvarez', 'Initial discovery call.', now() + interval '1 day', 'medium', 'pending', 'a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', null, now() + interval '20 hour', 'a0000000-0000-0000-0000-000000000003'),
  ('Renewal negotiation prep', 'Prepare renewal terms for Umbrella second site.', now() + interval '5 day', 'high', 'pending', 'a0000000-0000-0000-0000-000000000002', null, 'd0000000-0000-0000-0000-000000000009', null, 'a0000000-0000-0000-0000-000000000002');

-- ----------------------------------------------------------------------------
-- Notes
-- ----------------------------------------------------------------------------
insert into public.notes (entity_type, entity_id, author_id, body) values
  ('lead', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Jamie prefers email over calls. Follow up async.'),
  ('lead', 'e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Priya mentioned budget was approved this week.'),
  ('deal', 'd0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Legal is reviewing the MSA, expect redlines Friday.'),
  ('customer', 'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Owen is a great champion internally, very responsive.');

-- ----------------------------------------------------------------------------
-- Activities (timeline)
-- ----------------------------------------------------------------------------
insert into public.activities (entity_type, entity_id, type, body, created_by) values
  ('lead', 'e0000000-0000-0000-0000-000000000001', 'call', 'Intro call — 20 minutes, positive.', 'a0000000-0000-0000-0000-000000000003'),
  ('lead', 'e0000000-0000-0000-0000-000000000001', 'email', 'Sent pricing one-pager.', 'a0000000-0000-0000-0000-000000000003'),
  ('lead', 'e0000000-0000-0000-0000-000000000002', 'meeting', 'Procurement kickoff meeting with Priya and team.', 'a0000000-0000-0000-0000-000000000004'),
  ('deal', 'd0000000-0000-0000-0000-000000000005', 'status_change', 'Moved from Qualified to Negotiation.', 'a0000000-0000-0000-0000-000000000002'),
  ('deal', 'd0000000-0000-0000-0000-000000000006', 'status_change', 'Deal closed won.', 'a0000000-0000-0000-0000-000000000003'),
  ('customer', 'f0000000-0000-0000-0000-000000000001', 'note', 'Onboarding call scheduled for next week.', 'a0000000-0000-0000-0000-000000000003');
