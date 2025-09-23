-- Vendors table
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  name text not null,
  email text,
  phone text,
  tax_id text,
  categories text[] default '{}',
  rating int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Purchase Orders
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  vendor_id uuid references public.vendors(id) on delete set null,
  project_id text,
  date date not null default now(),
  status text not null default 'DRAFT',
  subtotal numeric not null default 0,
  tax_rate numeric not null default 0,
  tax_amount numeric not null default 0,
  total_cost numeric not null default 0,
  notes text,
  created_by text,
  approved_by text,
  received_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid references public.purchase_orders(id) on delete cascade,
  description text not null,
  quantity numeric not null,
  unit_price numeric not null,
  amount numeric not null,
  sku text,
  category text,
  equipment_id text,
  project_id text
);

-- RLS
alter table public.vendors enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

-- Policy: company-based access
create policy vendors_company_access on public.vendors
  for all using (company_id = auth.jwt() ->> 'companyId');

create policy pos_company_access on public.purchase_orders
  for all using (company_id = auth.jwt() ->> 'companyId');

create policy po_items_via_po on public.purchase_order_items
  for all using (exists (select 1 from public.purchase_orders p where p.id = po_id and p.company_id = (auth.jwt() ->> 'companyId')::uuid));
