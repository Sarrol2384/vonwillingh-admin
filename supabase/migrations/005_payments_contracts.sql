-- Payments ledger, recurring contracts, and invoice email send log

create type public.payment_method as enum ('eft', 'cash', 'card', 'other');
create type public.contract_status as enum ('draft', 'active', 'paused', 'ended');
create type public.billing_cadence as enum ('monthly', 'quarterly', 'yearly');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null,
  status public.contract_status not null default 'draft',
  cadence public.billing_cadence not null default 'monthly',
  start_date date not null default (current_date),
  end_date date,
  next_bill_on date,
  auto_send boolean not null default true,
  payment_terms_days integer,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_client_id_idx on public.contracts (client_id);
create index contracts_status_next_bill_idx on public.contracts (status, next_bill_on);

create table public.contract_lines (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  description text not null,
  qty numeric(14, 3) not null default 1,
  unit_price numeric(14, 2) not null default 0,
  sort_order integer not null default 0
);

create index contract_lines_contract_id_idx on public.contract_lines (contract_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  document_id uuid references public.documents (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  paid_at date not null default (current_date),
  method public.payment_method not null default 'eft',
  reference text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index payments_client_id_idx on public.payments (client_id);
create index payments_document_id_idx on public.payments (document_id);
create index payments_paid_at_idx on public.payments (paid_at desc);

create table public.invoice_sends (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  to_email text not null,
  status text not null check (status in ('sent', 'failed')),
  provider_message_id text not null default '',
  error text not null default '',
  sent_at timestamptz not null default now()
);

create index invoice_sends_document_id_idx on public.invoice_sends (document_id);

alter table public.documents
  add column if not exists contract_id uuid references public.contracts (id) on delete set null,
  add column if not exists public_token text,
  add column if not exists billing_period_start date;

create unique index if not exists documents_contract_period_uidx
  on public.documents (contract_id, billing_period_start)
  where contract_id is not null and billing_period_start is not null;

create unique index if not exists documents_public_token_uidx
  on public.documents (public_token)
  where public_token is not null;

create index if not exists documents_contract_id_idx on public.documents (contract_id);

alter table public.contracts enable row level security;
alter table public.contract_lines enable row level security;
alter table public.payments enable row level security;
alter table public.invoice_sends enable row level security;

create policy "Authenticated full access contracts"
  on public.contracts for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access contract_lines"
  on public.contract_lines for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access payments"
  on public.payments for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access invoice_sends"
  on public.invoice_sends for all to authenticated
  using (true) with check (true);

-- Public invoice view by token (anon can read matching invoice + lines + client bill-to fields)
create policy "Anon read documents by public_token"
  on public.documents for select to anon
  using (public_token is not null);

create policy "Anon read document_lines for public invoices"
  on public.document_lines for select to anon
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.public_token is not null
    )
  );

create policy "Anon read clients for public invoices"
  on public.clients for select to anon
  using (
    exists (
      select 1 from public.documents d
      where d.client_id = clients.id and d.public_token is not null
    )
  );

create policy "Anon read company_settings for public invoices"
  on public.company_settings for select to anon
  using (true);

grant all on public.contracts to authenticated;
grant all on public.contract_lines to authenticated;
grant all on public.payments to authenticated;
grant all on public.invoice_sends to authenticated;

grant select on public.documents to anon;
grant select on public.document_lines to anon;
grant select on public.clients to anon;
grant select on public.company_settings to anon;
