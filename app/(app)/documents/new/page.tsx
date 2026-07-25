import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  documentTypeFromParam,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/documents";
import { todayIsoDate } from "@/lib/money";
import { DocumentEditor } from "@/components/documents/document-editor";
import type { DocumentType } from "@/lib/supabase/types";

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; client_id?: string }>;
}) {
  const { type: typeParam, client_id: clientIdParam } = await searchParams;
  const type = documentTypeFromParam(typeParam) ?? "invoice";
  if (!documentTypeFromParam(typeParam)) {
    redirect(`/documents/new?type=${type}`);
  }

  const { supabase } = await requireUser();
  const [{ data: clients }, { data: settings }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("company_settings").select("*").limit(1).maybeSingle(),
  ]);

  const issue = todayIsoDate();
  let defaultDue = "";
  if (type === "quote") {
    defaultDue = addDays(
      issue,
      settings?.default_quote_validity_days ?? 30,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New {DOCUMENT_TYPE_LABELS[type as DocumentType]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Line amounts are the amounts charged — no VAT added.
        </p>
      </div>
      <DocumentEditor
        mode="create"
        documentType={type}
        clients={clients ?? []}
        defaultDueOrValid={defaultDue}
        defaultClientId={clientIdParam}
      />
    </div>
  );
}
