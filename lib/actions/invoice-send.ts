"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { sendBrevoEmail } from "@/lib/email/brevo";
import {
  buildInvoiceEmail,
  publicInvoiceUrl,
} from "@/lib/email/invoice-email";
import { newPublicToken } from "@/lib/billing";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

type DbClient = SupabaseClient<Database>;

export async function ensurePublicToken(
  supabase: DbClient,
  documentId: string,
  existingToken: string | null,
): Promise<string> {
  if (existingToken) return existingToken;
  const token = newPublicToken();
  const { error } = await supabase
    .from("documents")
    .update({ public_token: token, updated_at: new Date().toISOString() })
    .eq("id", documentId);
  if (error) throw new Error(error.message);
  return token;
}

export async function sendInvoiceEmailInternal(
  supabase: DbClient,
  documentId: string,
): Promise<ActionResult> {
  const { data: document, error } = await supabase
    .from("documents")
    .select("*, document_lines(*), clients(*)")
    .eq("id", documentId)
    .eq("type", "invoice")
    .maybeSingle();

  if (error || !document) {
    return { ok: false, error: error?.message ?? "Invoice not found" };
  }

  if (document.status === "void") {
    return { ok: false, error: "Cannot send a void invoice" };
  }

  const client = document.clients;
  if (!client) return { ok: false, error: "Client not found" };
  if (!client.email?.trim()) {
    return { ok: false, error: "Client has no email address" };
  }

  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!settings) {
    return { ok: false, error: "Company settings not found" };
  }

  let token = document.public_token;
  try {
    token = await ensurePublicToken(supabase, document.id, document.public_token);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create public link",
    };
  }

  const viewUrl = publicInvoiceUrl(token);
  const email = buildInvoiceEmail({
    document,
    lines: document.document_lines ?? [],
    client,
    settings,
    viewUrl,
  });

  const result = await sendBrevoEmail(
    {
      toEmail: client.email.trim(),
      toName: client.business_name?.trim() || client.name,
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent,
      replyTo: {
        email: settings.email,
        name: settings.contact_name,
      },
    },
    { email: settings.email, name: settings.company_name },
  );

  await supabase.from("invoice_sends").insert({
    document_id: document.id,
    client_id: client.id,
    to_email: client.email.trim(),
    status: result.ok ? "sent" : "failed",
    provider_message_id: result.ok ? result.messageId : "",
    error: result.ok ? "" : result.error,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  if (document.status === "draft") {
    await supabase
      .from("documents")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", document.id);
  }

  return { ok: true, id: document.id };
}

export async function sendInvoiceEmail(documentId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const result = await sendInvoiceEmailInternal(supabase, documentId);
  if (result.ok) {
    revalidatePath("/documents");
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/dashboard");
  }
  return result;
}
