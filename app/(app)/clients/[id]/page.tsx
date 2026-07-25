import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ClientForm } from "@/components/clients/client-form";
import { CreateClientDocumentButton } from "@/components/client-documents/create-client-document-button";
import { DownloadWordButton } from "@/components/documents/download-word-button";
import { DocumentTypeBadge } from "@/components/documents/status-badge";
import { DocumentStatusSelect } from "@/components/documents/document-status-select";
import { LinkButton } from "@/components/ui/link-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CLIENT_DOCUMENT_TYPE_LABELS } from "@/lib/client-documents";
import { formatDate, formatZar, totalFromDocumentLines } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

export default async function ClientHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [
    { data: client },
    { data: financialDocs },
    { data: clientDocs },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("documents")
      .select("*, document_lines(qty, unit_price)")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_documents")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!client) notFound();

  const displayName = client.business_name?.trim() || client.name;
  const quoteCount = financialDocs?.filter((d) => d.type === "quote").length ?? 0;
  const invoiceCount =
    financialDocs?.filter((d) => d.type === "invoice").length ?? 0;
  const agreementCount =
    clientDocs?.filter((d) => d.type === "service_agreement").length ?? 0;
  const briefCount =
    clientDocs?.filter((d) => d.type === "discovery_brief").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Client workspace — manage details and download Word documents.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/documents/new?type=quote&client_id=${id}`} variant="outline">
            New quote
          </LinkButton>
          <LinkButton href={`/documents/new?type=invoice&client_id=${id}`}>
            New invoice
          </LinkButton>
          <CreateClientDocumentButton
            clientId={id}
            type="service_agreement"
            label="New agreement"
          />
          <CreateClientDocumentButton
            clientId={id}
            type="discovery_brief"
            label="Discovery brief"
            variant="accent"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Quotes</CardDescription>
            <CardTitle className="text-2xl">{quoteCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Invoices</CardDescription>
            <CardTitle className="text-2xl">{invoiceCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Agreements</CardDescription>
            <CardTitle className="text-2xl">{agreementCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Discovery briefs</CardDescription>
            <CardTitle className="text-2xl">{briefCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Quotes, invoices, agreements, and discovery briefs for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!financialDocs?.length && !clientDocs?.length ? (
            <p className="text-sm text-muted-foreground">
              No documents yet. Use the buttons above to create a quote, agreement, or
              discovery brief.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title / Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialDocs?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link
                        href={`/documents/${doc.id}`}
                        className="font-medium hover:underline"
                      >
                        {doc.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <DocumentTypeBadge type={doc.type} />
                    </TableCell>
                    <TableCell>{formatDate(doc.issue_date)}</TableCell>
                    <TableCell>
                      <DocumentStatusSelect
                        id={doc.id}
                        type={doc.type}
                        status={doc.status}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZar(
                        totalFromDocumentLines(
                          (doc.document_lines as { qty: number; unit_price: number }[]) ??
                            [],
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <DownloadWordButton kind={doc.type} id={doc.id} label="Word" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {clientDocs?.map((doc) => (
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
                      <Badge variant="secondary">
                        {CLIENT_DOCUMENT_TYPE_LABELS[doc.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(doc.created_at.slice(0, 10))}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">
                      <DownloadWordButton kind={doc.type} id={doc.id} label="Word" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
          <CardDescription>Contact and billing information.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm mode="edit" client={client} />
        </CardContent>
      </Card>
    </div>
  );
}
