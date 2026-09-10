import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ClientForm } from "@/components/clients/client-form";
import { LinkButton } from "@/components/ui/link-button";
import {
  BILLING_CADENCE_LABELS,
  CONTRACT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  calcArSummary,
} from "@/lib/payments";
import { formatDate, formatZar } from "@/lib/money";
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

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [
    { data: client },
    { data: contracts },
    { data: invoices },
    { data: payments },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("contracts")
      .select("*")
      .eq("client_id", id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, number, total, status, issue_date")
      .eq("client_id", id)
      .eq("type", "invoice")
      .neq("status", "void")
      .order("issue_date", { ascending: false }),
    supabase
      .from("payments")
      .select("*, documents(number)")
      .eq("client_id", id)
      .order("paid_at", { ascending: false })
      .limit(20),
  ]);

  if (!client) notFound();

  const { data: allocated } = await supabase
    .from("payments")
    .select("amount, document_id")
    .eq("client_id", id);

  const summary = calcArSummary(invoices ?? [], allocated ?? []);
  const invoiced = summary.invoiced;
  const paid = summary.received;
  const outstanding = summary.outstanding;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {client.business_name?.trim() || client.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Client details, contracts, and payments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton
            href={`/clients/${client.id}/statement`}
            variant="outline"
          >
            Statement
          </LinkButton>
          <LinkButton
            href={`/contracts/new?client_id=${client.id}`}
            variant="outline"
          >
            New contract
          </LinkButton>
          <LinkButton
            href={`/payments/new?client_id=${client.id}`}
            variant="outline"
          >
            Record payment
          </LinkButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Invoiced</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatZar(invoiced)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatZar(paid)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outstanding (invoiced − paid)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatZar(outstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Contracts
        </h2>
        {!contracts?.length ? (
          <p className="text-sm text-muted-foreground">No contracts yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {contracts.map((contract) => (
              <li key={contract.id}>
                <Link
                  href={`/contracts/${contract.id}`}
                  className="font-medium hover:underline"
                >
                  {contract.title}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {CONTRACT_STATUS_LABELS[contract.status]} ·{" "}
                  {BILLING_CADENCE_LABELS[contract.cadence]}
                  {contract.next_bill_on
                    ? ` · next ${formatDate(contract.next_bill_on)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Recent payments
        </h2>
        {!payments?.length ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const doc = payment.documents as { number: string } | null;
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paid_at)}</TableCell>
                    <TableCell>
                      {payment.document_id && doc?.number ? (
                        <Link
                          href={`/documents/${payment.document_id}`}
                          className="hover:underline"
                        >
                          {doc.number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {PAYMENT_METHOD_LABELS[payment.method]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZar(Number(payment.amount))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Edit details</CardTitle>
          <CardDescription>Contact and billing information</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm mode="edit" client={client} />
        </CardContent>
      </Card>
    </div>
  );
}
