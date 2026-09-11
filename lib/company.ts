export const COMPANY_DEFAULTS = {
  company_name: "VonWillingh Online",
  contact_name: "Sarrol Von Willingh",
  email: "admin@vonwillingh.co.za",
  phone: "081 216 3629",
  address: "177 Magdouw Street, Russel's Rest, Eerste River, 7100",
  website: "https://vonwillingh.co.za",
  vat_number: "",
  registration_number: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_branch_code: "",
  default_payment_terms_days: 14,
  default_quote_validity_days: 30,
  invoice_prefix: "INV",
  quote_prefix: "QUO",
  credit_note_prefix: "CN",
} as const;

export function hasBankDetails(settings: {
  bank_name: string | null;
  bank_account_number: string | null;
}): boolean {
  return Boolean(settings.bank_name?.trim() && settings.bank_account_number?.trim());
}
