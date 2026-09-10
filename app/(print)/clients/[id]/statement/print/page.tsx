import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { COMPANY_DEFAULTS } from "@/lib/company";
import {
  loadClientStatement,
  parseStatementRange,
} from "@/lib/statements";
import { PrintStatement } from "@/components/print/print-statement";
import { PrintToolbar } from "@/components/print/print-toolbar";
import type { CompanySettings } from "@/lib/supabase/types";

export default async function PrintClientStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase } = await requireUser();

  const range = parseStatementRange(query.from, query.to);
  if ("error" in range) notFound();

  const [statement, { data: settings }] = await Promise.all([
    loadClientStatement(supabase, id, range.from, range.to),
    supabase.from("company_settings").select("*").limit(1).maybeSingle(),
  ]);

  if ("error" in statement) notFound();

  const company = (settings ?? {
    id: "fallback",
    ...COMPANY_DEFAULTS,
    updated_at: new Date().toISOString(),
  }) as CompanySettings;

  return (
    <div className="mx-auto max-w-[210mm] bg-neutral-100 p-6 print:max-w-none print:bg-white print:p-0">
      <PrintToolbar />
      <PrintStatement statement={statement} company={company} />
    </div>
  );
}
