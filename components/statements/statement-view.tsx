import Link from "next/link";
import { formatDate, formatZar } from "@/lib/money";
import type { ClientStatement } from "@/lib/statements";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StatementView({ statement }: { statement: ClientStatement }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Opening</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {formatZar(statement.openingBalance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Invoiced</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {formatZar(statement.periodInvoiced)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {formatZar(statement.periodPaid)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Amount due</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {formatZar(statement.closingBalance)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Invoices</TableHead>
            <TableHead className="text-right">Payments</TableHead>
            <TableHead className="text-right">Amount due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statement.lines.map((line, index) => (
            <TableRow key={`${line.kind}-${line.date}-${index}`}>
              <TableCell>{formatDate(line.date)}</TableCell>
              <TableCell>
                {line.documentId && line.kind === "invoice" ? (
                  <Link
                    href={`/documents/${line.documentId}`}
                    className="hover:underline"
                  >
                    {line.description}
                  </Link>
                ) : (
                  line.description
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {line.debit ? formatZar(line.debit) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {line.credit ? formatZar(line.credit) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatZar(line.balance)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
