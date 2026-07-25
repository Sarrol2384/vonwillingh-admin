# VonWillingh Admin

Invoices, quotes, and credit notes for VonWillingh Online.

## Setup

1. Copy `.env.local.example` to `.env.local` and add your Supabase URL + anon key.
2. In the Supabase SQL Editor, run [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql).
3. Create an Auth user in Supabase (Authentication → Users) for yourself.
4. `npm install` then `npm run dev` (http://localhost:3016).

## Features

- Clients
- Quotes, tax invoices, credit notes (ZAR, 15% VAT default)
- Print / Save as PDF (browser print, A4 letterhead)
- Quote → invoice conversion
- Company settings (VAT, CIPC, bank details)
