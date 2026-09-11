-- Per-line done date + reusable catalog items for quotes/invoices
alter table public.document_lines
  add column if not exists done_date date;

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_price numeric(14, 2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_items_active_sort_idx
  on public.catalog_items (active, sort_order, name);

alter table public.catalog_items enable row level security;

create policy "Authenticated full access catalog_items"
  on public.catalog_items for all to authenticated
  using (true) with check (true);

grant all on public.catalog_items to authenticated;
