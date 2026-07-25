-- Add business name to clients
alter table public.clients
  add column if not exists business_name text not null default '';
