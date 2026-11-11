import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PublicPayPanel } from "@/components/invoice/public-pay-panel";
import { COMPANY_DEFAULTS } from "@/lib/company";
import { PrintDocument } from "@/components/print/print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { formatZar } from "@/lib/money";
import { invoiceCanBePaidOnline, isPayfastConfigured } from "@/lib/payfast";
import { invoiceBalance } from "@/lib/payments";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const PUBLIC_INVOICE_COLUMNS = `
  id,
  type,
  status,
  number,
  total,
  issue_date,
  due_or_valid_until,
  notes,
  document_lines (
    id,
    description,
    qty,
    unit_price,
    sort_order,
    done_date
  ),
  clients (
    name,
    business_name,
    email,
    phone,
    address
  )
` as const;

const PUBLIC_COMPANY_COLUMNS =
  "company_name, contact_name, registration_number, bank_name, bank_account_name, bank_account_number, bank_branch_code" as const;

function paymentNotice(
  value: string | string[] | undefined,
): "received" | "cancelled" | null {
  const notice = Array.isArray(value) ? value[0] : value;
  if (notice === "received" || notice === "cancelled") return notice;
  return null;
}

function paySearch(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const name of [
    "x-vercel-protection-bypass",
    "x-vercel-set-bypass-cookie",
  ]) {
    const value = params[name];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) search.set(name, first);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const payment = query.payment;
  if (!token || token.length < 16) notFound();

  // Read the service role key on the request, not at build time.
  await connection();

  const supabase = createSupabaseServiceRoleClient();

  const [{ data: document, error: documentError }, { data: settings }] =
    await Promise.all([
      supabase
        .from("documents")
        .select(PUBLIC_INVOICE_COLUMNS)
        .eq("public_token", token)
        .eq("type", "invoice")
        .maybeSingle(),
      supabase
        .from("company_settings")
        .select(PUBLIC_COMPANY_COLUMNS)
        .limit(1)
        .maybeSingle(),
    ]);

  if (documentError || !document || !document.clients) notFound();

  const { data: paymentRows, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, document_id")
    .eq("document_id", document.id);

  const balanceKnown = !paymentsError;
  const balance = balanceKnown
    ? invoiceBalance(document, paymentRows ?? [])
    : 0;
  const settled =
    balanceKnown && document.status !== "void" && balance <= 0;
  const showPay =
    balanceKnown &&
    isPayfastConfigured() &&
    invoiceCanBePaidOnline({
      type: document.type,
      status: document.status,
      balance,
    });

  return (
    <div className="mx-auto min-h-screen max-w-[210mm] bg-neutral-100 p-6 print:max-w-none print:bg-white print:p-0">
      <PublicPayPanel
        token={token}
        search={paySearch(query)}
        balanceLabel={formatZar(balance)}
        showPay={showPay}
        showDue={balanceKnown && !settled && document.status !== "void"}
        settled={settled}
        notice={paymentNotice(payment)}
      />
      <PrintToolbar />
      <PrintDocument
        document={document}
        lines={document.document_lines ?? []}
        client={document.clients}
        company={settings ?? COMPANY_DEFAULTS}
      />
    </div>
  );
}
