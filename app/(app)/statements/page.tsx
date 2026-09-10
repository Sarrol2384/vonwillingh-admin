import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatZar } from "@/lib/money";
import { clientArRows } from "@/lib/payments";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function StatementsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Statements</h1>
        <p className="text-sm text-muted-foreground">
          Open a client statement, choose a date range, then print or email it.
        </p>
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
              <TableHead>Email</TableHead>
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
                <TableCell>{row.email || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatZar(row.outstanding)}
                </TableCell>
                <TableCell className="text-right">
                  <LinkButton
                    href={`/clients/${row.clientId}/statement`}
                    variant="outline"
                    size="sm"
                  >
                    Open statement
                  </LinkButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
