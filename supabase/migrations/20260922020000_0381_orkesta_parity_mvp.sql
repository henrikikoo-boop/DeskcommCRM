-- Orkesta CRM parity MVP: companies, proposals, booking links, webchat.
-- Idempotent; mirrored in baseline appendix.

create table if not exists public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  document text,
  phone text,
  email text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_companies_org on public.crm_companies (organization_id, name);
alter table public.crm_companies enable row level security;
drop policy if exists tenant_isolation_crm_companies_all on public.crm_companies;
create policy tenant_isolation_crm_companies_all on public.crm_companies
  for all using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids()));
grant select, insert, update, delete on public.crm_companies to authenticated;
grant all on public.crm_companies to service_role;

alter table public.contacts
  add column if not exists company_id uuid references public.crm_companies(id) on delete set null;
create index if not exists idx_contacts_company on public.contacts (organization_id, company_id)
  where company_id is not null;

create table if not exists public.crm_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid,
  contact_id uuid,
  company_id uuid references public.crm_companies(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'viewed', 'accepted', 'rejected')
  ),
  currency char(3) not null default 'BRL',
  amount_cents bigint,
  body_html text not null default '',
  public_token text not null unique,
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_proposals_org on public.crm_proposals (organization_id, created_at desc);
create index if not exists idx_crm_proposals_token on public.crm_proposals (public_token);
alter table public.crm_proposals enable row level security;
drop policy if exists tenant_isolation_crm_proposals_all on public.crm_proposals;
create policy tenant_isolation_crm_proposals_all on public.crm_proposals
  for all using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids()));
grant select, insert, update, delete on public.crm_proposals to authenticated;
grant all on public.crm_proposals to service_role;

create table if not exists public.crm_booking_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  public_token text not null unique,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_booking_links_org on public.crm_booking_links (organization_id);
create index if not exists idx_crm_booking_links_token on public.crm_booking_links (public_token);
alter table public.crm_booking_links enable row level security;
drop policy if exists tenant_isolation_crm_booking_links_all on public.crm_booking_links;
create policy tenant_isolation_crm_booking_links_all on public.crm_booking_links
  for all using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids()));
grant select, insert, update, delete on public.crm_booking_links to authenticated;
grant all on public.crm_booking_links to service_role;

create table if not exists public.crm_booking_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_link_id uuid not null references public.crm_booking_links(id) on delete cascade,
  requester_name text not null,
  requester_email text,
  requester_phone text,
  preferred_at timestamptz,
  notes text,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'cancelled')
  ),
  created_at timestamptz not null default now()
);
create index if not exists idx_crm_booking_requests_org
  on public.crm_booking_requests (organization_id, created_at desc);
alter table public.crm_booking_requests enable row level security;
drop policy if exists tenant_isolation_crm_booking_requests_all on public.crm_booking_requests;
create policy tenant_isolation_crm_booking_requests_all on public.crm_booking_requests
  for all using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids()));
grant select, insert, update, delete on public.crm_booking_requests to authenticated;
grant all on public.crm_booking_requests to service_role;

create table if not exists public.crm_webchat_widgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  public_token text not null unique,
  welcome_message text not null default 'Olá! Como posso ajudar?',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_webchat_widgets_token on public.crm_webchat_widgets (public_token);
alter table public.crm_webchat_widgets enable row level security;
drop policy if exists tenant_isolation_crm_webchat_widgets_all on public.crm_webchat_widgets;
create policy tenant_isolation_crm_webchat_widgets_all on public.crm_webchat_widgets
  for all using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids()));
grant select, insert, update, delete on public.crm_webchat_widgets to authenticated;
grant all on public.crm_webchat_widgets to service_role;

create table if not exists public.crm_webchat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  widget_id uuid not null references public.crm_webchat_widgets(id) on delete cascade,
  session_token text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_crm_webchat_messages_session
  on public.crm_webchat_messages (organization_id, widget_id, session_token, created_at);
alter table public.crm_webchat_messages enable row level security;
drop policy if exists tenant_isolation_crm_webchat_messages_all on public.crm_webchat_messages;
create policy tenant_isolation_crm_webchat_messages_all on public.crm_webchat_messages
  for all using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids()));
grant select, insert, update, delete on public.crm_webchat_messages to authenticated;
grant all on public.crm_webchat_messages to service_role;
