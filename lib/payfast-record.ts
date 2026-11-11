import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { syncInvoicePaidStatus } from "@/lib/invoice-payment-status";
import { todayIsoDate } from "@/lib/money";
import { roundMoney } from "@/lib/payments";
import type { Database } from "@/lib/supabase/types";

type DbClient = SupabaseClient<Database>;

export async function recordPayfastPayment(
  supabase: DbClient,
  input: {
    clientId: string;
    documentId: string;
    amount: number;
    pfPaymentId: string;
  },
): Promise<{ ok: true; duplicate: boolean } | { ok: false; error: string }> {
  const pfPaymentId = input.pfPaymentId.trim();
  const amount = roundMoney(input.amount);
  if (!pfPaymentId || amount <= 0) {
    return { ok: false, error: "Invalid PayFast payment" };
  }

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("pf_payment_id", pfPaymentId)
    .maybeSingle();

  if (existing) {
    await syncInvoicePaidStatus(supabase, input.documentId);
    return { ok: true, duplicate: true };
  }

  const { error } = await supabase.from("payments").insert({
    client_id: input.clientId,
    document_id: input.documentId,
    amount,
    paid_at: todayIsoDate(),
    method: "payfast",
    reference: pfPaymentId,
    notes: "Paid online with PayFast",
    pf_payment_id: pfPaymentId,
  });

  if (error) {
    if (error.code === "23505") {
      await syncInvoicePaidStatus(supabase, input.documentId);
      return { ok: true, duplicate: true };
    }
    return { ok: false, error: error.message };
  }

  await syncInvoicePaidStatus(supabase, input.documentId);
  return { ok: true, duplicate: false };
}
