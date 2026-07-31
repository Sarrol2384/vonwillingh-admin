-- VonWillingh Admin: invoices, quotes, credit notes
create extension if not exists "pgcrypto";

create type public.document_type as enum ('quote', 'invoice', 'credit_note');
create type public.document_status as enum (
  'draft',
  'sent',
  'accepted',
  'declined',
  'paid',
  'issued',
  'void'
);

create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'VonWillingh Online',
  contact_name text not null default 'Sarrol Von Willingh',
  email text not null default 'sarrol@vonwillingh.co.za',
  phone text not null default '081 216 3629',
  address text not null default '177 Magdouw Street, Russel''s Rest, Eerste River, 7100',
  website text not null default 'https://vonwillingh.co.za',
  vat_number text not null default '',
  registration_number text not null default '',
  bank_name text not null default '',
  bank_account_name text not null default '',
  bank_account_number text not null default '',
  bank_branch_code text not null default '',
  default_payment_terms_days integer not null default 14,
  default_quote_validity_days integer not null default 30,
  invoice_prefix text not null default 'INV',
  quote_prefix text not null default 'QUO',
  credit_note_prefix text not null default 'CN',
  updated_at timestamptz not null default now()
);

insert into public.company_settings (id) values ('00000000-0000-0000-0000-000000000001');

create table public.document_sequences (
  doc_type public.document_type not null,
  year integer not null,
  last_number integer not null default 0,
  primary key (doc_type, year)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  vat_number text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  type public.document_type not null,
  number text not null unique,
  status public.document_status not null default 'draft',
  client_id uuid not null references public.clients (id) on delete restrict,
  issue_date date not null default (current_date),
  due_or_valid_until date,
  subtotal numeric(14, 2) not null default 0,
  vat_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  notes text not null default '',
  source_quote_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_type_idx on public.documents (type);
create index documents_client_id_idx on public.documents (client_id);
create index documents_issue_date_idx on public.documents (issue_date desc);

create table public.document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  description text not null,
  qty numeric(14, 3) not null default 1,
  unit_price numeric(14, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 0,
  sort_order integer not null default 0
);

create index document_lines_document_id_idx on public.document_lines (document_id);

create or replace function public.next_document_number(
  p_type public.document_type,
  p_year integer default extract(year from current_date)::integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_prefix text;
begin
  insert into public.document_sequences (doc_type, year, last_number)
  values (p_type, p_year, 1)
  on conflict (doc_type, year)
  do update set last_number = public.document_sequences.last_number + 1
  returning last_number into v_next;

  select case p_type
    when 'quote' then quote_prefix
    when 'invoice' then invoice_prefix
    when 'credit_note' then credit_note_prefix
  end
  into v_prefix
  from public.company_settings
  limit 1;

  if v_prefix is null then
    v_prefix := case p_type
      when 'quote' then 'QUO'
      when 'invoice' then 'INV'
      else 'CN'
    end;
  end if;

  return v_prefix || '-' || p_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

alter table public.company_settings enable row level security;
alter table public.document_sequences enable row level security;
alter table public.clients enable row level security;
alter table public.documents enable row level security;
alter table public.document_lines enable row level security;

create policy "Authenticated full access company_settings"
  on public.company_settings for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access document_sequences"
  on public.document_sequences for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access clients"
  on public.clients for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access documents"
  on public.documents for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access document_lines"
  on public.document_lines for all to authenticated
  using (true) with check (true);

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant execute on function public.next_document_number(public.document_type, integer) to authenticated;
