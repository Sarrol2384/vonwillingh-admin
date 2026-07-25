import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { COMPANY_DEFAULTS } from "@/lib/company";
import { buildAgreementDocx } from "@/lib/docx/agreement";
import { buildDiscoveryBriefDocx } from "@/lib/docx/discovery-brief";
import { buildDocxBuffer, docxResponse, sanitizeFilename } from "@/lib/docx/download";
import { buildFinancialDocumentDocx } from "@/lib/docx/financial-document";
import {
  parseClientDocumentContent,
  type AgreementContent,
  type DiscoveryBriefContent,
} from "@/lib/client-documents";
import type { CompanySettings } from "@/lib/supabase/types";

const FINANCIAL_KINDS = ["quote", "invoice", "credit_note"] as const;
type FinancialKind = (typeof FINANCIAL_KINDS)[number];

function isFinancialKind(kind: string): kind is FinancialKind {
  return FINANCIAL_KINDS.includes(kind as FinancialKind);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await context.params;
  const { supabase } = await requireUser();

  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const company = (settings ?? {
    id: "fallback",
    ...COMPANY_DEFAULTS,
    updated_at: new Date().toISOString(),
  }) as CompanySettings;

  if (isFinancialKind(kind)) {
    const { data: document } = await supabase
      .from("documents")
      .select("*, clients(*), document_lines(*)")
      .eq("id", id)
      .maybeSingle();

    if (!document || !document.clients || document.type !== kind) {
      notFound();
    }

    const docx = buildFinancialDocumentDocx({
      document,
      client: document.clients,
      lines: document.document_lines ?? [],
      company,
    });
    const buffer = await buildDocxBuffer(docx);
    const clientLabel =
      document.clients.business_name?.trim() || document.clients.name;
    const filename = `${document.number}-${clientLabel}`;
    return docxResponse(buffer, filename);
  }

  if (kind === "service_agreement" || kind === "discovery_brief") {
    const { data: clientDoc } = await supabase
      .from("client_documents")
      .select("*, clients(*)")
      .eq("id", id)
      .maybeSingle();

    if (!clientDoc || !clientDoc.clients || clientDoc.type !== kind) {
      notFound();
    }

    const content = parseClientDocumentContent(
      clientDoc.type,
      clientDoc.content,
    );
    const clientLabel =
      clientDoc.clients.business_name?.trim() || clientDoc.clients.name;

    const docx =
      kind === "service_agreement"
        ? buildAgreementDocx({
            title: clientDoc.title,
            client: clientDoc.clients,
            company,
            content: content as AgreementContent,
          })
        : buildDiscoveryBriefDocx({
            client: clientDoc.clients,
            company,
            content: content as DiscoveryBriefContent,
          });

    const buffer = await buildDocxBuffer(docx);
    const prefix =
      kind === "service_agreement" ? "Agreement" : "Discovery-Brief";
    return docxResponse(
      buffer,
      `${prefix}-${sanitizeFilename(clientLabel)}`,
    );
  }

  notFound();
}
