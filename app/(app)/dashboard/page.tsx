import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate, formatZar } from "@/lib/money";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
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
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
} from "@/components/documents/status-badge";

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const [
    { count: clientCount },
    { count: quoteCount },
    { count: invoiceCount },
    { data: recent },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("type", "quote"),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("type", "invoice"),
    supabase
      .from("documents")
      .select("*, clients(name, business_name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Create and print invoices, quotes, and credit notes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/documents/new?type=quote" variant="outline">
            New quote
          </LinkButton>
          <LinkButton href="/documents/new?type=invoice">New invoice</LinkButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Clients</CardDescription>
            <CardTitle className="text-3xl">{clientCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Quotes</CardDescription>
            <CardTitle className="text-3xl">{quoteCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Invoices</CardDescription>
            <CardTitle className="text-3xl">{invoiceCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent documents</CardTitle>
          <CardDescription>Latest quotes, invoices, and credit notes</CardDescription>
        </CardHeader>
        <CardContent>
          {!recent?.length ? (
            <p className="text-sm text-muted-foreground">
              No documents yet.{" "}
              <Link href="/documents/new?type=invoice" className="underline">
                Create your first invoice
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((doc) => {
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
                    <TableCell>
                      <DocumentTypeBadge type={doc.type} />
                    </TableCell>
                    <TableCell>{clientLabel}</TableCell>
                    <TableCell>{formatDate(doc.issue_date)}</TableCell>
                    <TableCell>
                      <DocumentStatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZar(Number(doc.total))}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Tip: open a document and use Print / PDF for an A4 letterhead. Document
        types: {Object.values(DOCUMENT_TYPE_LABELS).join(", ")}.
      </p>
    </div>
  );
}
