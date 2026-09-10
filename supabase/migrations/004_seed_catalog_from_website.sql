-- Optional one-shot seed of website packages / care / cloud / add-ons into catalog_items.
-- Safe to re-run: skips names that already exist.
-- Prefer the Items UI "Import website packages" button when signed in; use this in the Supabase SQL editor if needed.
-- Requires 003_line_done_date_and_catalog.sql (catalog_items table).

insert into public.catalog_items (name, unit_price, active, sort_order)
select
  v.name,
  v.unit_price,
  true,
  coalesce((select max(sort_order) from public.catalog_items), 0) + v.ord
from (
  values
    -- Website packages (once-off)
    (1,  'Starter Website (once-off)', 2999::numeric),
    (2,  'Business Website (once-off, from)', 4999),
    (3,  'Professional Website (once-off, from)', 7999),
    (4,  'Business Pro Website (once-off, from)', 11999),
    (5,  'E-Commerce Website (once-off, from)', 9999),
    (6,  'Custom Website / Web Platform (once-off, from)', 15000),
    (7,  'Website + Custom Business Software (once-off, from)', 25000),
    -- Care plans (monthly)
    (8,  'Essential Care (monthly)', 299),
    (9,  'Business Care (monthly)', 599),
    (10, 'Professional Care (monthly)', 999),
    (11, 'Growth Care (monthly)', 1499),
    (12, 'Business Platform Care (monthly, from)', 1999),
    -- Cloud infrastructure
    (13, 'Cloud Essential (monthly)', 299),
    (14, 'Cloud Business (monthly)', 599),
    (15, 'Cloud Pro (monthly, from)', 999),
    (16, 'High-Usage / Enterprise Cloud (custom quote)', 0),
    -- Usage-based services
    (17, 'Business Email (per mailbox/month, from)', 99),
    (18, 'Transactional Email (monthly, from)', 199),
    (19, 'AI & Automation Usage (usage-based)', 0),
    (20, 'SMS & WhatsApp Messaging (usage-based)', 0),
    (21, 'External API & Integration Costs (quoted)', 0),
    -- Add-ons (quoted)
    (22, 'Additional website pages (quoted)', 0),
    (23, 'Professional copywriting (quoted)', 0),
    (24, 'Content creation (quoted)', 0),
    (25, 'Additional content entry (quoted)', 0),
    (26, 'Advanced forms (quoted)', 0),
    (27, 'Booking systems (quoted)', 0),
    (28, 'Payment gateways (quoted)', 0),
    (29, 'E-commerce functionality (quoted)', 0),
    (30, 'Customer portals (quoted)', 0),
    (31, 'Staff portals (quoted)', 0),
    (32, 'CRM integration (quoted)', 0),
    (33, 'API integrations (quoted)', 0),
    (34, 'Business email setup (quoted)', 0),
    (35, 'Additional storage (quoted)', 0),
    (36, 'Custom dashboards (quoted)', 0),
    (37, 'Database functionality (quoted)', 0),
    (38, 'WhatsApp integrations (quoted)', 0),
    (39, 'SMS integrations (quoted)', 0),
    (40, 'AI functionality (quoted)', 0),
    (41, 'Workflow automation (quoted)', 0),
    (42, 'Custom business software (quoted)', 0)
) as v(ord, name, unit_price)
where not exists (
  select 1 from public.catalog_items c where c.name = v.name
);
