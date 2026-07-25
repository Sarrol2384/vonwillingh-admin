import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ClientDocumentEditor } from "@/components/client-documents/client-document-editor";
import { CLIENT_DOCUMENT_TYPE_LABELS } from "@/lib/client-documents";

export default async function ClientDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: clientDocument } = await supabase
    .from("client_documents")
    .select("*, clients(*)")
    .eq("id", id)
    .maybeSingle();

  if (!clientDocument || !clientDocument.clients) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {clientDocument.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {CLIENT_DOCUMENT_TYPE_LABELS[clientDocument.type]} ·{" "}
          <Link
            href={`/clients/${clientDocument.client_id}`}
            className="underline"
          >
            Back to client
          </Link>
        </p>
      </div>
      <ClientDocumentEditor
        clientDocument={clientDocument}
        client={clientDocument.clients}
      />
    </div>
  );
}
