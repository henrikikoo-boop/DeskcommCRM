-- Proposal templates + structured editor (blocks, line items, tracking).
-- Idempotent; Orkesta Completo Phase A.

create table if not exists public.crm_proposal_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  is_active boolean not null default true,
  design jsonb not null default '{}'::jsonb,
  blocks jsonb not null default '[]'::jsonb,
  default_line_items jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_proposal_templates_org
  on public.crm_proposal_templates (organization_id, is_active, updated_at desc);

alter table public.crm_proposal_templates enable row level security;
drop policy if exists tenant_isolation_crm_proposal_templates_all on public.crm_proposal_templates;
create policy tenant_isolation_crm_proposal_templates_all on public.crm_proposal_templates
  for all using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids()));
grant select, insert, update, delete on public.crm_proposal_templates to authenticated;
grant all on public.crm_proposal_templates to service_role;

alter table public.crm_proposals
  add column if not exists template_id uuid references public.crm_proposal_templates(id) on delete set null,
  add column if not exists version integer not null default 1,
  add column if not exists valid_until timestamptz,
  add column if not exists design jsonb not null default '{}'::jsonb,
  add column if not exists blocks jsonb not null default '[]'::jsonb,
  add column if not exists view_count integer not null default 0,
  add column if not exists open_seconds integer not null default 0,
  add column if not exists last_viewed_at timestamptz;

create index if not exists idx_crm_proposals_lead
  on public.crm_proposals (organization_id, lead_id)
  where lead_id is not null;

create index if not exists idx_crm_proposals_template
  on public.crm_proposals (organization_id, template_id)
  where template_id is not null;

create table if not exists public.crm_proposal_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null references public.crm_proposals(id) on delete cascade,
  product_id uuid,
  name text not null check (length(trim(name)) > 0),
  description text,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit_cents bigint not null default 0 check (unit_cents >= 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_proposal_line_items_proposal
  on public.crm_proposal_line_items (proposal_id, sort_order);

alter table public.crm_proposal_line_items enable row level security;
drop policy if exists tenant_isolation_crm_proposal_line_items_all on public.crm_proposal_line_items;
create policy tenant_isolation_crm_proposal_line_items_all on public.crm_proposal_line_items
  for all using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids()));
grant select, insert, update, delete on public.crm_proposal_line_items to authenticated;
grant all on public.crm_proposal_line_items to service_role;
