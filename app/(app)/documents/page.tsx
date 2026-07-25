import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  documentTypeFromParam,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/documents";
import { formatDate, formatZar, totalFromDocumentLines } from "@/lib/money";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentStatusSelect } from "@/components/documents/document-status-select";
import { DocumentTypeBadge } from "@/components/documents/status-badge";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const type = documentTypeFromParam(typeParam);
  const { supabase } = await requireUser();

  let query = supabase
    .from("documents")
    .select("*, clients(name, business_name), document_lines(qty, unit_price)")
    .order("issue_date", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data: documents } = await query;

  const title = type ? DOCUMENT_TYPE_LABELS[type] + "s" : "Documents";
  const newHref = type
    ? `/documents/new?type=${type}`
    : "/documents/new?type=invoice";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {type
              ? `All ${DOCUMENT_TYPE_LABELS[type].toLowerCase()}s`
              : "All quotes, invoices, and credit notes"}
          </p>
        </div>
        <LinkButton href={newHref}>
          New {type ? DOCUMENT_TYPE_LABELS[type].toLowerCase() : "invoice"}
        </LinkButton>
      </div>

      {!documents?.length ? (
        <p className="text-sm text-muted-foreground">
          No documents yet.{" "}
          <Link href={newHref} className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              {!type ? <TableHead>Type</TableHead> : null}
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
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
                    href={`/documents/${doc.id}`}
                    className="font-medium hover:underline"
                  >
                    {doc.number}
                  </Link>
                </TableCell>
                {!type ? (
                  <TableCell>
                    <DocumentTypeBadge type={doc.type} />
                  </TableCell>
                ) : null}
                <TableCell>{clientLabel}</TableCell>
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
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
