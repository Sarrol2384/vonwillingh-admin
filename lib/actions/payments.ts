"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { roundMoney } from "@/lib/payments";
import { todayIsoDate } from "@/lib/money";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const paymentSchema = z.object({
  client_id: z.string().uuid(),
  document_id: z.string().uuid("Select an invoice to allocate this payment"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paid_at: z.string().min(1),
  method: z.enum(["eft", "cash", "card", "other"]),
  reference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

async function syncInvoicePaidStatus(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  documentId: string,
) {
  const { data: invoice } = await supabase
    .from("documents")
    .select("id, total, status, type")
    .eq("id", documentId)
    .eq("type", "invoice")
    .maybeSingle();

  if (!invoice || invoice.status === "void") return;

  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("document_id", documentId);

  const paidTotal = roundMoney(
    (payments ?? []).reduce((sum, row) => sum + Number(row.amount), 0),
  );
  const invoiceTotal = roundMoney(Number(invoice.total));

  if (paidTotal >= invoiceTotal && invoice.status !== "paid") {
    await supabase
      .from("documents")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", documentId);
  } else if (
    paidTotal < invoiceTotal &&
    invoice.status === "paid" &&
    paidTotal > 0
  ) {
    await supabase
      .from("documents")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", documentId);
  } else if (paidTotal === 0 && invoice.status === "paid") {
    await supabase
      .from("documents")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", documentId);
  }
}

export async function createPayment(formData: FormData): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse({
    client_id: formData.get("client_id"),
    document_id: formData.get("document_id"),
    amount: formData.get("amount"),
    paid_at: formData.get("paid_at") || todayIsoDate(),
    method: formData.get("method") || "eft",
    reference: formData.get("reference") || "",
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid payment data",
    };
  }

  const { supabase } = await requireUser();

  const { data: invoice } = await supabase
    .from("documents")
    .select("id, client_id, type")
    .eq("id", parsed.data.document_id)
    .maybeSingle();

  if (!invoice || invoice.type !== "invoice") {
    return { ok: false, error: "Invoice not found" };
  }
  if (invoice.client_id !== parsed.data.client_id) {
    return { ok: false, error: "Invoice does not belong to this client" };
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      client_id: parsed.data.client_id,
      document_id: parsed.data.document_id,
      amount: roundMoney(parsed.data.amount),
      paid_at: parsed.data.paid_at,
      method: parsed.data.method,
      reference: parsed.data.reference.trim(),
      notes: parsed.data.notes.trim(),
    })
    .select("id")
    .single();

  if (error || !payment) {
    return { ok: false, error: error?.message ?? "Could not record payment" };
  }

  await syncInvoicePaidStatus(supabase, parsed.data.document_id);

  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${parsed.data.client_id}`);
  revalidatePath(`/documents/${parsed.data.document_id}`);
  revalidatePath("/documents");

  const redirectTo = String(formData.get("redirect_to") || "").trim();
  if (redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }

  return { ok: true, id: payment.id };
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!payment) return { ok: false, error: "Payment not found" };

  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (payment.document_id) {
    await syncInvoicePaidStatus(supabase, payment.document_id);
    revalidatePath(`/documents/${payment.document_id}`);
    revalidatePath("/documents");
  }

  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${payment.client_id}`);
  return { ok: true, id };
}
