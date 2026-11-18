"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { ensurePublicToken } from "@/lib/actions/invoice-send";
import { publicInvoiceUrl } from "@/lib/public-url";
import { invoiceBalance } from "@/lib/payments";
import {
  buildInvoiceWhatsAppShare,
  otherUnpaidForWhatsApp,
  type WhatsAppClientInvoice,
} from "@/lib/whatsapp";

export type WhatsAppLinkResult =
  | { ok: true; href: string }
  | { ok: false; error: string };

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Creates the public invoice link if needed and returns a wa.me URL.
 * Does not send a message, write send history, or change the invoice status.
 * Opening the link only fills WhatsApp; the owner presses Send there.
 */
export async function prepareInvoiceWhatsAppLink(
  documentId: string,
): Promise<WhatsAppLinkResult> {
  const { supabase } = await requireUser();

  const { data: document, error } = await supabase
    .from("documents")
    .select(
      "id, client_id, type, status, number, total, issue_date, due_or_valid_until, public_token, clients(name, business_name, phone)",
    )
    .eq("id", documentId)
    .maybeSingle();

  if (error || !document) {
    return { ok: false, error: error?.message ?? "Invoice not found" };
  }
  if (document.type !== "invoice") {
    return { ok: false, error: "Only invoices can be shared on WhatsApp" };
  }
  if (document.status === "void") {
    return { ok: false, error: "This invoice is void" };
  }

  const [{ data: payments }, { data: settings }, { data: siblings }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount, document_id")
        .eq("client_id", document.client_id),
      supabase
        .from("company_settings")
        .select("company_name, contact_name")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("documents")
        .select(
          "id, type, status, number, total, issue_date, due_or_valid_until, public_token",
        )
        .eq("client_id", document.client_id)
        .eq("type", "invoice")
        .neq("status", "void"),
    ]);

  const paymentRows = payments ?? [];
  const clientInvoices: WhatsAppClientInvoice[] = (siblings ?? []).map(
    (row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      number: row.number,
      issueDate: row.issue_date,
      dueDate: row.due_or_valid_until,
      balance: invoiceBalance(
        { id: row.id, total: row.total, status: row.status },
        paymentRows,
      ),
      viewUrl: null,
      hasPublicToken: Boolean(row.public_token),
    }),
  );
  const unpaidOthers = otherUnpaidForWhatsApp(document.id, clientInvoices);
  const tokenById = new Map<string, string>();
  if (document.public_token) tokenById.set(document.id, document.public_token);
  for (const row of siblings ?? []) {
    if (row.public_token) tokenById.set(row.id, row.public_token);
  }

  const needsToken = new Set<string>(
    unpaidOthers.invoices
      .filter((invoice) => !invoice.hasPublicToken)
      .map((invoice) => invoice.id),
  );
  if (!tokenById.has(document.id)) needsToken.add(document.id);

  let createdToken = false;
  try {
    await Promise.all(
      [...needsToken].map(async (id) => {
        const existing =
          id === document.id
            ? document.public_token
            : (siblings ?? []).find((row) => row.id === id)?.public_token ??
              null;
        const token = await ensurePublicToken(supabase, id, existing);
        tokenById.set(id, token);
        createdToken = true;
      }),
    );
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Could not create the invoice link",
    };
  }

  const currentToken = tokenById.get(document.id);
  if (!currentToken) {
    return { ok: false, error: "Could not create the invoice link" };
  }

  const client = one(document.clients);
  const share = buildInvoiceWhatsAppShare({
    clientName: client?.name,
    businessName: client?.business_name,
    phone: client?.phone,
    number: document.number,
    total: document.total,
    balance: invoiceBalance(document, paymentRows),
    issueDate: document.issue_date,
    dueDate: document.due_or_valid_until,
    companyName: settings?.company_name,
    senderName: settings?.contact_name,
    viewUrl: publicInvoiceUrl(currentToken),
    otherInvoices: unpaidOthers.invoices.map((invoice) => {
      const token = tokenById.get(invoice.id);
      return {
        ...invoice,
        viewUrl: token ? publicInvoiceUrl(token) : null,
      };
    }),
  });

  if (createdToken) {
    revalidatePath("/documents");
    revalidatePath(`/documents/${documentId}`);
  }

  return { ok: true, href: share.href };
}
