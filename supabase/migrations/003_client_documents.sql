-- Client documents: service agreements and discovery briefs
create type public.client_document_type as enum (
  'service_agreement',
  'discovery_brief'
);

create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  type public.client_document_type not null,
  title text not null,
  status text not null default 'draft',
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_documents_client_id_idx on public.client_documents (client_id);
create index client_documents_type_idx on public.client_documents (type);

alter table public.client_documents enable row level security;

create policy "Authenticated full access on client_documents"
  on public.client_documents
  for all
  to authenticated
  using (true)
  with check (true);
