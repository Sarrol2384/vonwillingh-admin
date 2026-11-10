import { connection } from "next/server";
import { notFound } from "next/navigation";
import { COMPANY_DEFAULTS } from "@/lib/company";
import { PrintDocument } from "@/components/print/print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const PUBLIC_INVOICE_COLUMNS = `
  type,
  number,
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

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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

  return (
    <div className="mx-auto min-h-screen max-w-[210mm] bg-neutral-100 p-6 print:max-w-none print:bg-white print:p-0">
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
