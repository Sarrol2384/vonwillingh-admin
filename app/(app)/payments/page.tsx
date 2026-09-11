import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LinkButton } from "@/components/ui/link-button";
import { PaymentList } from "@/components/payments/payment-list";
import { formatZar } from "@/lib/money";
import {
  Card,
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
import { calcArSummary, remainingByInvoice } from "@/lib/payments";

export default async function PaymentsPage() {
  const { supabase } = await requireUser();

  const [{ data: payments }, { data: invoices }] = await Promise.all([
    supabase
      .from("payments")
      .select("*, clients(name, business_name), documents(number)")
      .order("paid_at", { ascending: false })
      .limit(100),
    supabase
      .from("documents")
      .select("id, number, total, status, clients(name, business_name)")
      .eq("type", "invoice")
      .neq("status", "void")
      .order("issue_date", { ascending: false }),
  ]);

  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount, document_id");

  const summary = calcArSummary(invoices ?? [], allPayments ?? []);
  const remaining = remainingByInvoice(invoices ?? [], allPayments ?? []);
  const openInvoices = (invoices ?? []).filter(
    (invoice) => (remaining.get(invoice.id) ?? 0) > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Payments reduce outstanding: invoiced minus received.
          </p>
        </div>
        <LinkButton href="/payments/new">Record payment</LinkButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Invoiced</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatZar(summary.invoiced)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Received</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatZar(summary.received)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outstanding (invoiced − received)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatZar(summary.outstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {openInvoices.length ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Still due
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openInvoices.map((invoice) => {
                const client = invoice.clients as {
                  name: string;
                  business_name: string;
                } | null;
                const label =
                  client?.business_name?.trim() || client?.name || "—";
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/documents/${invoice.id}`}
                        className="font-medium hover:underline"
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell>{label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZar(remaining.get(invoice.id) ?? 0)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No unpaid invoices.</p>
      )}

      <PaymentList payments={payments ?? []} />
    </div>
  );
}
