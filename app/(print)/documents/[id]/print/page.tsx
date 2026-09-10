import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { COMPANY_DEFAULTS } from "@/lib/company";
import { PrintDocument } from "@/components/print/print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";
import type { CompanySettings } from "@/lib/supabase/types";

export default async function PrintDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [{ data: document }, { data: settings }] = await Promise.all([
    supabase
      .from("documents")
      .select("*, clients(*), document_lines(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("company_settings").select("*").limit(1).maybeSingle(),
  ]);

  if (!document || !document.clients) notFound();

  const company = (settings ?? {
    id: "fallback",
    ...COMPANY_DEFAULTS,
    updated_at: new Date().toISOString(),
  }) as CompanySettings;

  return (
    <div className="mx-auto max-w-[210mm] bg-neutral-100 p-6 print:max-w-none print:bg-white print:p-0">
      <PrintToolbar />
      <PrintDocument
        document={document}
        client={document.clients}
        lines={document.document_lines ?? []}
        company={company}
      />
    </div>
  );
}
