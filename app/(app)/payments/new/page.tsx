import { requireUser } from "@/lib/auth";
import { PaymentForm } from "@/components/payments/payment-form";
import { roundMoney } from "@/lib/payments";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; document_id?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireUser();

  const [{ data: clients }, { data: invoices }, { data: allocated }] =
    await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase
        .from("documents")
        .select("id, number, total, client_id, status")
        .eq("type", "invoice")
        .neq("status", "void")
        .order("issue_date", { ascending: false }),
      supabase
        .from("payments")
        .select("amount, document_id")
        .not("document_id", "is", null),
    ]);

  const paidByInvoice: Record<string, number> = {};
  for (const payment of allocated ?? []) {
    if (!payment.document_id) continue;
    paidByInvoice[payment.document_id] = roundMoney(
      (paidByInvoice[payment.document_id] ?? 0) + Number(payment.amount),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Record payment</h1>
        <p className="text-sm text-muted-foreground">
          Allocate a payment to an invoice so outstanding decreases.
        </p>
      </div>
      <PaymentForm
        clients={clients ?? []}
        invoices={invoices ?? []}
        paidByInvoice={paidByInvoice}
        defaultClientId={params.client_id}
        defaultDocumentId={params.document_id}
        redirectTo="/payments"
      />
    </div>
  );
}
