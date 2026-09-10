/**
 * Snapshot of vonwillingh-online pricing for admin catalog_items.
 * One-shot import — edit Items afterward if website prices change.
 *
 * Rules:
 * - Parse first ZAR amount from marketing priceDisplay
 * - Custom Quote / usage-based / no fixed price → unit_price 0
 * - Starter Website uses normal list price 2999 (not promo)
 */

export type CatalogSeedItem = {
  name: string;
  unit_price: number;
};

/** Website packages (once-off) */
const websitePackages: CatalogSeedItem[] = [
  { name: "Starter Website (once-off)", unit_price: 2999 },
  { name: "Business Website (once-off, from)", unit_price: 4999 },
  { name: "Professional Website (once-off, from)", unit_price: 7999 },
  { name: "Business Pro Website (once-off, from)", unit_price: 11999 },
  { name: "E-Commerce Website (once-off, from)", unit_price: 9999 },
  { name: "Custom Website / Web Platform (once-off, from)", unit_price: 15000 },
  {
    name: "Website + Custom Business Software (once-off, from)",
    unit_price: 25000,
  },
];

/** Monthly care plans */
const carePlans: CatalogSeedItem[] = [
  { name: "Essential Care (monthly)", unit_price: 299 },
  { name: "Business Care (monthly)", unit_price: 599 },
  { name: "Professional Care (monthly)", unit_price: 999 },
  { name: "Growth Care (monthly)", unit_price: 1499 },
  { name: "Business Platform Care (monthly, from)", unit_price: 1999 },
];

/** Cloud infrastructure plans */
const cloudPlans: CatalogSeedItem[] = [
  { name: "Cloud Essential (monthly)", unit_price: 299 },
  { name: "Cloud Business (monthly)", unit_price: 599 },
  { name: "Cloud Pro (monthly, from)", unit_price: 999 },
  { name: "High-Usage / Enterprise Cloud (custom quote)", unit_price: 0 },
];

/** Usage-based / third-party services */
const usageBasedServices: CatalogSeedItem[] = [
  { name: "Business Email (per mailbox/month, from)", unit_price: 99 },
  { name: "Transactional Email (monthly, from)", unit_price: 199 },
  { name: "AI & Automation Usage (usage-based)", unit_price: 0 },
  { name: "SMS & WhatsApp Messaging (usage-based)", unit_price: 0 },
  { name: "External API & Integration Costs (quoted)", unit_price: 0 },
];

/** Add-ons with no fixed website prices */
const addOns: CatalogSeedItem[] = [
  { name: "Additional website pages (quoted)", unit_price: 0 },
  { name: "Professional copywriting (quoted)", unit_price: 0 },
  { name: "Content creation (quoted)", unit_price: 0 },
  { name: "Additional content entry (quoted)", unit_price: 0 },
  { name: "Advanced forms (quoted)", unit_price: 0 },
  { name: "Booking systems (quoted)", unit_price: 0 },
  { name: "Payment gateways (quoted)", unit_price: 0 },
  { name: "E-commerce functionality (quoted)", unit_price: 0 },
  { name: "Customer portals (quoted)", unit_price: 0 },
  { name: "Staff portals (quoted)", unit_price: 0 },
  { name: "CRM integration (quoted)", unit_price: 0 },
  { name: "API integrations (quoted)", unit_price: 0 },
  { name: "Business email setup (quoted)", unit_price: 0 },
  { name: "Additional storage (quoted)", unit_price: 0 },
  { name: "Custom dashboards (quoted)", unit_price: 0 },
  { name: "Database functionality (quoted)", unit_price: 0 },
  { name: "WhatsApp integrations (quoted)", unit_price: 0 },
  { name: "SMS integrations (quoted)", unit_price: 0 },
  { name: "AI functionality (quoted)", unit_price: 0 },
  { name: "Workflow automation (quoted)", unit_price: 0 },
  { name: "Custom business software (quoted)", unit_price: 0 },
];

export const WEBSITE_CATALOG_SEED: CatalogSeedItem[] = [
  ...websitePackages,
  ...carePlans,
  ...cloudPlans,
  ...usageBasedServices,
  ...addOns,
];
