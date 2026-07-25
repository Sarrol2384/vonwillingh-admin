import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CLIENT_DOCUMENT_TYPE_LABELS, clientDocumentTypeFromParam } from "@/lib/client-documents";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DownloadWordButton } from "@/components/documents/download-word-button";
import { formatDate } from "@/lib/money";

export default async function ClientDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const filterType = clientDocumentTypeFromParam(typeParam);
  const { supabase } = await requireUser();

  let query = supabase
    .from("client_documents")
    .select("*, clients(name, business_name)")
    .order("created_at", { ascending: false });

  if (filterType) {
    query = query.eq("type", filterType);
  }

  const { data: docs } = await query;
  const pageTitle = filterType
    ? CLIENT_DOCUMENT_TYPE_LABELS[filterType]
    : "Agreements & briefs";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Service agreements and discovery briefs. Download Word to edit, then
            export PDF from Word.
          </p>
        </div>
        <LinkButton href="/clients" variant="outline">
          Pick a client
        </LinkButton>
      </div>

      {!docs?.length ? (
        <p className="text-sm text-muted-foreground">
          No agreements or briefs yet. Open a{" "}
          <Link href="/clients" className="underline">
            client
          </Link>{" "}
          and create one from their workspace.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc) => {
              const client = doc.clients as {
                name: string;
                business_name: string;
              } | null;
              const clientLabel =
                client?.business_name?.trim() || client?.name || "—";
              return (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Link
                      href={`/client-documents/${doc.id}`}
                      className="font-medium hover:underline"
                    >
                      {doc.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${doc.client_id}`}
                      className="hover:underline"
                    >
                      {clientLabel}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CLIENT_DOCUMENT_TYPE_LABELS[doc.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(doc.created_at.slice(0, 10))}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <DownloadWordButton kind={doc.type} id={doc.id} label="Word" />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
