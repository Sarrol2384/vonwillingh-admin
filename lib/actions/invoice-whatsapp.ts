"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { ensurePublicToken } from "@/lib/actions/invoice-send";
import { publicInvoiceUrl } from "@/lib/public-url";
import { invoiceBalance } from "@/lib/payments";
import { buildInvoiceWhatsAppShare } from "@/lib/whatsapp";

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
      "id, type, status, number, total, issue_date, due_or_valid_until, public_token, clients(name, business_name, phone)",
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

  const [{ data: payments }, { data: settings }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, document_id")
      .eq("document_id", document.id),
    supabase
      .from("company_settings")
      .select("company_name, contact_name")
      .limit(1)
      .maybeSingle(),
  ]);

  let token = document.public_token;
  try {
    token = await ensurePublicToken(
      supabase,
      document.id,
      document.public_token,
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create the invoice link",
    };
  }

  const client = one(document.clients);
  const share = buildInvoiceWhatsAppShare({
    clientName: client?.name,
    businessName: client?.business_name,
    phone: client?.phone,
    number: document.number,
    total: document.total,
    balance: invoiceBalance(document, payments ?? []),
    issueDate: document.issue_date,
    dueDate: document.due_or_valid_until,
    companyName: settings?.company_name,
    senderName: settings?.contact_name,
    viewUrl: publicInvoiceUrl(token),
  });

  if (!document.public_token) {
    revalidatePath("/documents");
    revalidatePath(`/documents/${documentId}`);
  }

  return { ok: true, href: share.href };
}
