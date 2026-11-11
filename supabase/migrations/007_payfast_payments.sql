-- PayFast online payments.
--
-- Apply this once in the Supabase SQL editor before clients pay online.
-- It stores PayFast's transaction id so a retried notification cannot record
-- the same payment twice, and adds a PayFast method for the payments ledger.
--
-- The anon role is not granted anything. Public invoice pages and the ITN
-- webhook use the service role on the server.

alter type public.payment_method add value if not exists 'payfast';

alter table public.payments
  add column if not exists pf_payment_id text;

create unique index if not exists payments_pf_payment_id_uidx
  on public.payments (pf_payment_id)
  where pf_payment_id is not null;

revoke all privileges on table public.payments from anon;

grant select, insert on table public.payments to service_role;
grant update (status, updated_at) on table public.documents to service_role;
