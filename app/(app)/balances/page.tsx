import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatZar } from "@/lib/money";
import { calcArSummary, clientArRows } from "@/lib/payments";
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

export default async function BalancesPage() {
  const { supabase } = await requireUser();

  const [{ data: clients }, { data: invoices }, { data: payments }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, business_name, email")
        .order("name"),
      supabase
        .from("documents")
        .select("client_id, total, status")
        .eq("type", "invoice"),
      supabase.from("payments").select("client_id, amount"),
    ]);

  const rows = clientArRows(clients ?? [], invoices ?? [], payments ?? []);
  const totals = calcArSummary(invoices ?? [], payments ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Balances</h1>
        <p className="text-sm text-muted-foreground">
          What each client has been invoiced, paid, and still owes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Invoiced</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatZar(totals.invoiced)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Received</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatZar(totals.received)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatZar(totals.outstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!rows.length ? (
        <p className="text-sm text-muted-foreground">
          No clients yet.{" "}
          <Link href="/clients/new" className="underline">
            Add a client
          </Link>
          .
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Invoiced</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.clientId}>
                <TableCell>
                  <Link
                    href={`/clients/${row.clientId}`}
                    className="font-medium hover:underline"
                  >
                    {row.label}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatZar(row.invoiced)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatZar(row.received)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatZar(row.outstanding)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/clients/${row.clientId}/statement`}
                    className="text-sm underline"
                  >
                    Statement
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
