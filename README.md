# VonWillingh Admin

Invoices, quotes, credit notes, recurring contracts, payments, and Brevo invoice email for VonWillingh Online.

## Setup (any PC)

1. Clone the repo (skip if you already have it). Use the `sync` branch — that is this invoices/quotes app:

   ```bash
   git clone -b sync https://github.com/Sarrol2384/vonwillingh-admin.git
   cd vonwillingh-admin
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy [`.env.local.example`](.env.local.example) to `.env.local` and fill in values (same Supabase project on every PC).

4. In the Supabase SQL Editor (once per project), run migrations in order:
   - [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql)
   - [`supabase/migrations/002_client_business_name.sql`](supabase/migrations/002_client_business_name.sql) if needed
   - [`supabase/migrations/003_client_documents.sql`](supabase/migrations/003_client_documents.sql) **service agreements and discovery briefs**
   - [`supabase/migrations/003_line_done_date_and_catalog.sql`](supabase/migrations/003_line_done_date_and_catalog.sql)
   - [`supabase/migrations/004_seed_catalog_from_website.sql`](supabase/migrations/004_seed_catalog_from_website.sql) optional catalog seed
   - [`supabase/migrations/005_payments_contracts.sql`](supabase/migrations/005_payments_contracts.sql) **payments, contracts, invoice email log**
   - [`supabase/migrations/006_public_invoice_anon_lockdown.sql`](supabase/migrations/006_public_invoice_anon_lockdown.sql) **stop the anon key reading invoices, clients, and bank details**

   `003_client_documents.sql` and `003_line_done_date_and_catalog.sql` share a number but are different scripts. Run both on a new database, in that order. Do not renumber or re-run them on a database that already has them.

   On a database that already has agreements and payments, the only new script is `006_public_invoice_anon_lockdown.sql`. Run it once, after this app version is deployed and `SUPABASE_SERVICE_ROLE_KEY` is set on the server. Steps are in [Public invoice links](#public-invoice-links). It does not change `client_documents`.

5. Create an Auth user in Supabase (Authentication → Users) if you have not already.

6. Start the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3017

## Features

- Clients (business name, contact, balances)
- Catalog items (reusable names + prices)
- Quotes, invoices, credit notes (ZAR; no VAT charged), including Word download
- Service agreements and discovery briefs (`client_documents`), including Word download
- **Payments ledger** — record EFT/cash/card payments; allocate to invoices; auto-mark paid when balance is covered
- **Recurring contracts** — monthly / quarterly / yearly; generate invoices on schedule
- **Brevo email** — send invoices to clients; contracts with auto-send email when billed
- Public invoice link for clients (`/invoice/[token]`) — one invoice per token, loaded on the server
- Print / Save as PDF (browser print, A4 letterhead)
- Quote → invoice conversion and document duplicate
- Company settings (CIPC, bank details, payment terms, letterhead)

## Payments & contracts

1. Create a **contract** for a client (status **Active**, set **Next bill on**, enable **Auto-email**).
2. Use **Run billing now** (Dashboard / Contracts) or wait for the daily cron.
3. Active contracts due on or before today get a new invoice; if auto-send is on and the client has an email, Brevo sends it.
4. When money arrives, **Record payment** and allocate it to the invoice.

## Brevo setup

1. Create a Brevo account and verify your sender domain/email.
2. Create an API key (SMTP & API → API keys).
3. Set in `.env.local`:
   - `BREVO_API_KEY`
   - `BREVO_SENDER_EMAIL` (must be a verified sender)
   - `BREVO_SENDER_NAME`
   - `NEXT_PUBLIC_APP_URL` (so emails include a working “View invoice” link)

## Automated billing (cron)

- Local / manual: click **Run contract billing** while signed in.
- Production (Vercel): [`vercel.json`](vercel.json) runs `GET /api/billing/run` daily at 06:00 UTC.
- Set `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in the host environment. The same service role key is what `/invoice/[token]` uses to load a single invoice. Do not prefix it with `NEXT_PUBLIC_`.
- Vercel sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured.
- Manual trigger:

  ```bash
  curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/billing/run
  ```

## Public invoice links

A client opens `/invoice/[token]` from the email. The page still shows the same invoice: line items, the client name and contact details printed on the bill, and the company and bank details. The server loads that one invoice with `SUPABASE_SERVICE_ROLE_KEY`. The anon key cannot list documents, clients, or company settings.

Apply the lockdown once per Supabase project:

1. In Supabase → Project Settings → API, copy the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY` on the server (`.env.local` and the host, such as Vercel). Leave the anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do not put the service role key in a `NEXT_PUBLIC_` variable.
2. Deploy this version of the app, so `/invoice/[token]` reads through the service role.
3. In the Supabase SQL Editor, paste and run [`supabase/migrations/006_public_invoice_anon_lockdown.sql`](supabase/migrations/006_public_invoice_anon_lockdown.sql) once. Do not edit or re-run the older migrations.
4. Open an existing public invoice link and confirm it still shows that invoice.
5. Optional: with the anon key, `GET /rest/v1/documents` and `GET /rest/v1/company_settings` should be rejected instead of returning rows.

If step 3 runs before step 2, public links show “not found” until the new server is live.

## Syncing between PCs

- Do **not** copy the whole project folder (skip `node_modules` and `.next`).
- Day to day: `git pull` → work → `git push` → `git pull` on the other PC.
- Recreate `.env.local` on each machine; it is never committed.
