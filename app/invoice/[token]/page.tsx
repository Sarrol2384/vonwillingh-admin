import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { COMPANY_DEFAULTS } from "@/lib/company";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { PrintDocument } from "@/components/print/print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";
import type { CompanySettings, Database } from "@/lib/supabase/types";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  // Public page uses anon client + RLS policies for public_token rows
  const supabase = createClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: document }, { data: settings }] = await Promise.all([
    supabase
      .from("documents")
      .select("*, document_lines(*), clients(*)")
      .eq("public_token", token)
      .eq("type", "invoice")
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
    <div className="mx-auto min-h-screen max-w-[210mm] bg-neutral-100 p-6 print:max-w-none print:bg-white print:p-0">
      <PrintToolbar />
      <PrintDocument
        document={document}
        lines={document.document_lines ?? []}
        client={document.clients}
        company={company}
      />
    </div>
  );
}
