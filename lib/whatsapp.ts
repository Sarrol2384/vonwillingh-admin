import { formatZar } from "@/lib/money";
import { moneyNumber, roundMoney } from "@/lib/payments";

const SA_INTERNATIONAL = /^27\d{9}$/;
const DEFAULT_COMPANY = "VonWillingh Online";

export type InvoiceWhatsAppShare = {
  href: string;
  message: string;
  /** International digits, or null when WhatsApp must open without a recipient. */
  phone: string | null;
  settled: boolean;
  /** Shown when the client number cannot be placed in the chat link. */
  hint: string | null;
};

export function normaliseSaWhatsAppPhone(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("0")) {
    digits = `27${digits.slice(1)}`;
  } else if (digits.startsWith("270") && digits.length === 12) {
    // +27 (0)82… keeps a trunk zero after the country code.
    digits = `27${digits.slice(3)}`;
  } else if (digits.length === 9) {
    digits = `27${digits}`;
  }

  if (!SA_INTERNATIONAL.test(digits)) return null;
  return digits;
}

export function whatsAppPhoneHint(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return "No phone number on this client. WhatsApp will open so you can choose the contact.";
  }
  if (!normaliseSaWhatsAppPhone(trimmed)) {
    return "This phone number isn't in a WhatsApp format. You'll choose the contact.";
  }
  return null;
}

/** Click-to-chat link. An empty phone opens WhatsApp so a contact can be picked. */
export function whatsAppChatUrl(phone: string | null, text: string): string {
  const textParam = encodeURIComponent(text);
  if (phone) return `https://wa.me/${phone}?text=${textParam}`;
  return `https://wa.me/?text=${textParam}`;
}

export function invoiceGreetingName(
  clientName: string | null | undefined,
  businessName?: string | null,
): string {
  const first = clientName?.trim().split(/\s+/)[0];
  if (first) return first;
  const business = businessName?.trim();
  if (business) return business;
  return "there";
}

function formatMessageDate(date: string | null | undefined): string {
  if (!date) return "";
  const parsed = new Date(date.includes("T") ? date : `${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
  }).format(parsed);
}

function signature(senderName: string, companyName: string): string {
  if (senderName.toLowerCase() === companyName.toLowerCase()) {
    return `Kind regards,\n${companyName}`;
  }
  return `Kind regards,\n${senderName}\n${companyName}`;
}

export function buildInvoiceWhatsAppShare(input: {
  clientName?: string | null;
  businessName?: string | null;
  phone?: string | null;
  number: string;
  total: number | string;
  balance: number | string;
  issueDate?: string | null;
  dueDate?: string | null;
  companyName?: string | null;
  senderName?: string | null;
  viewUrl?: string | null;
}): InvoiceWhatsAppShare {
  const company = input.companyName?.trim() || DEFAULT_COMPANY;
  const sender = input.senderName?.trim() || company;
  const greeting = invoiceGreetingName(input.clientName, input.businessName);
  const totalAmount = roundMoney(Math.max(0, moneyNumber(input.total)));
  const dueAmount = roundMoney(Math.max(0, moneyNumber(input.balance)));
  const applied = roundMoney(Math.max(0, totalAmount - dueAmount));
  const settled = dueAmount <= 0;
  const issued = formatMessageDate(input.issueDate);
  const due = formatMessageDate(input.dueDate);
  const when = [issued ? `issued ${issued}` : "", due ? `due ${due}` : ""]
    .filter(Boolean)
    .join(", ");
  const timing = when ? `, ${when}` : "";
  const totalLabel = formatZar(totalAmount);

  const summary = settled
    ? `Invoice ${input.number} from ${company} for ${totalLabel} is paid in full${when ? ` (${when})` : ""}. Thank you.`
    : applied > 0
      ? `Please find invoice ${input.number} from ${company} for ${totalLabel}${timing}. A credit of ${formatZar(applied)} has been applied, so the amount due is ${formatZar(dueAmount)}.`
      : `Please find invoice ${input.number} from ${company} for ${totalLabel}${timing}.`;

  const viewUrl = input.viewUrl?.trim() || "";
  const link = viewUrl
    ? settled
      ? `You can view the invoice here:\n${viewUrl}`
      : `You can view the invoice and pay online here:\n${viewUrl}`
    : "";

  const message = [
    `Hi ${greeting},`,
    summary,
    link,
    signature(sender, company),
  ]
    .filter(Boolean)
    .join("\n\n");

  const phone = normaliseSaWhatsAppPhone(input.phone);
  return {
    href: whatsAppChatUrl(phone, message),
    message,
    phone,
    settled,
    hint: whatsAppPhoneHint(input.phone),
  };
}

/** Direct wa.me link once a public token exists; otherwise the button creates one on click. */
export function invoiceWhatsAppButtonState(
  input: Parameters<typeof buildInvoiceWhatsAppShare>[0] & {
    hasPublicToken: boolean;
  },
): { href: string | null; settled: boolean; hint: string | null } {
  const share = buildInvoiceWhatsAppShare(input);
  return {
    href: input.hasPublicToken ? share.href : null,
    settled: share.settled,
    hint: share.hint,
  };
}
