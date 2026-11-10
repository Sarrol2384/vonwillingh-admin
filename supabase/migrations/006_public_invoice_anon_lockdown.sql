-- Public invoice links are rendered by the app server, which looks up one
-- invoice by its token with the service role key.
--
-- The anon policies added in 005_payments_contracts.sql did not check the
-- token. They let the public anon key read every document that had a
-- public_token, the lines on those documents, the clients on those documents,
-- and every row in company_settings (including bank details).
--
-- Drop those policies and take away the anon grants. Authenticated staff
-- access is unchanged. Run this once in the Supabase SQL editor after the
-- matching app version is deployed and SUPABASE_SERVICE_ROLE_KEY is set.

begin;

drop policy if exists "Anon read documents by public_token"
  on public.documents;
drop policy if exists "Anon read document_lines for public invoices"
  on public.document_lines;
drop policy if exists "Anon read clients for public invoices"
  on public.clients;
drop policy if exists "Anon read company_settings for public invoices"
  on public.company_settings;

revoke all privileges on table public.documents from anon;
revoke all privileges on table public.document_lines from anon;
revoke all privileges on table public.clients from anon;
revoke all privileges on table public.company_settings from anon;

-- A grant to PUBLIC would still apply to anon after the revokes above.
revoke all privileges on table public.documents from public;
revoke all privileges on table public.document_lines from public;
revoke all privileges on table public.clients from public;
revoke all privileges on table public.company_settings from public;

-- The server looks up one invoice with the service role key, which bypasses
-- RLS but still needs a table grant.
grant select on table public.documents to service_role;
grant select on table public.document_lines to service_role;
grant select on table public.clients to service_role;
grant select on table public.company_settings to service_role;

commit;
