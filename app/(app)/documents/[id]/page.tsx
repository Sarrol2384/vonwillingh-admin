import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
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

  const [{ data: document }, { data: clients }, { data: catalogItems }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("*, document_lines(*)")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("clients").select("*").order("name"),
      supabase
        .from("catalog_items")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("name"),
    ]);

  if (!document) notFound();

  const lines = document.document_lines ?? [];

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
        catalogItems={catalogItems ?? []}
        document={document}
        lines={lines}
      />
    </div>
  );
}
