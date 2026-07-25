import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import { calcDocumentTotals } from "@/lib/money";
import { DocumentEditor } from "@/components/documents/document-editor";
import { DocumentActions } from "@/components/documents/document-actions";
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
} from "@/components/documents/status-badge";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [{ data: document }, { data: clients }] = await Promise.all([
    supabase
      .from("documents")
      .select("*, document_lines(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("clients").select("*").order("name"),
  ]);

  if (!document) notFound();

  const lines = document.document_lines ?? [];
  const totals = calcDocumentTotals(
    lines.map((line) => ({
      qty: Number(line.qty),
      unit_price: Number(line.unit_price),
      vat_rate: 0,
    })),
  );
  if (Number(document.total) !== totals.total) {
    await supabase
      .from("documents")
      .update({
        subtotal: totals.subtotal,
        vat_total: 0,
        total: totals.total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    document.total = totals.total;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {document.number}
            </h1>
            <DocumentTypeBadge type={document.type} />
            <DocumentStatusBadge status={document.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Edit {DOCUMENT_TYPE_LABELS[document.type].toLowerCase()} details
          </p>
        </div>
        <DocumentActions document={document} />
      </div>

      <DocumentEditor
        mode="edit"
        documentType={document.type}
        clients={clients ?? []}
        document={document}
        lines={lines}
      />
    </div>
  );
}
