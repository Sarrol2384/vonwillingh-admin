import type { SupabaseClient } from "@supabase/supabase-js";
import { roundMoney } from "@/lib/payments";
import type { Database } from "@/lib/supabase/types";

type DbClient = SupabaseClient<Database>;

/** Mark an invoice paid once allocated payments cover its total. */
export async function syncInvoicePaidStatus(
  supabase: DbClient,
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
