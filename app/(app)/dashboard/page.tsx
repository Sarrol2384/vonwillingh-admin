import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate, formatZar } from "@/lib/money";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import { calcOutstanding } from "@/lib/payments";
import { LinkButton } from "@/components/ui/link-button";
import { RunBillingButton } from "@/components/contracts/run-billing-button";
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
    { count: activeContracts },
    { data: recent },
    { data: recentPayments },
    { data: invoices },
    { data: allocatedPayments },
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
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("documents")
      .select("*, clients(name, business_name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("payments")
      .select("*, clients(name, business_name)")
      .order("paid_at", { ascending: false })
      .limit(5),
    supabase
      .from("documents")
      .select("id, total, status")
      .eq("type", "invoice")
      .neq("status", "void"),
    supabase
      .from("payments")
      .select("amount, document_id"),
  ]);

  const outstanding = calcOutstanding(invoices ?? [], allocatedPayments ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Invoices, recurring contracts, and client payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RunBillingButton label="Run contract billing" />
          <LinkButton href="/payments/new" variant="outline">
            Record payment
          </LinkButton>
          <LinkButton href="/documents/new?type=invoice">New invoice</LinkButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Clients</CardDescription>
            <CardTitle className="text-3xl">{clientCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active contracts</CardDescription>
            <CardTitle className="text-3xl">{activeContracts ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Invoices</CardDescription>
            <CardTitle className="text-3xl">{invoiceCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatZar(outstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
            <CardDescription>Latest money received from clients</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentPayments?.length ? (
              <p className="text-sm text-muted-foreground">
                No payments yet.{" "}
                <Link href="/payments/new" className="underline">
                  Record a payment
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => {
                    const client = payment.clients as {
                      name: string;
                      business_name: string;
                    } | null;
                    const label =
                      client?.business_name?.trim() || client?.name || "—";
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paid_at)}</TableCell>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatZar(Number(payment.amount))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent documents</CardTitle>
            <CardDescription>
              Latest quotes, invoices, and credit notes
            </CardDescription>
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((doc) => (
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
                      <TableCell>
                        <DocumentStatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatZar(Number(doc.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Quotes on file: {quoteCount ?? 0}. Document types:{" "}
        {Object.values(DOCUMENT_TYPE_LABELS).join(", ")}.
      </p>
    </div>
  );
}
