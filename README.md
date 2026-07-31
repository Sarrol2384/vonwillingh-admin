# VonWillingh Admin

Invoices, quotes, and credit notes for VonWillingh Online.

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

3. Copy [`.env.local.example`](.env.local.example) to `.env.local` and add your Supabase URL + anon key (same values on every PC).

4. In the Supabase SQL Editor (once per project), run:
   - [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql)
   - [`supabase/migrations/002_client_business_name.sql`](supabase/migrations/002_client_business_name.sql) if the clients table already existed without `business_name`

5. Create an Auth user in Supabase (Authentication → Users) if you have not already.

6. Start the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3017

## Syncing between PCs

- Do **not** copy the whole project folder (skip `node_modules` and `.next`).
- Day to day: `git pull` → work → `git push` → `git pull` on the other PC.
- Recreate `.env.local` on each machine; it is never committed.

## Features

- Clients (including business name)
- Quotes, invoices, credit notes (ZAR; no VAT charged)
- Print / Save as PDF (browser print, A4 letterhead)
- Quote → invoice conversion and document duplicate
- Company settings (CIPC, bank details, letterhead)
