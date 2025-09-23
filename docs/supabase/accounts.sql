-- Budgets per project
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  project_id text not null,
  amount numeric not null default 0,
  spent numeric not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budgets enable row level security;

create policy budgets_company_access on public.budgets
  for all using (company_id = auth.jwt() ->> 'companyId');
