import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LinkButton } from "@/components/ui/link-button";
import { RunBillingButton } from "@/components/contracts/run-billing-button";
import {
  BILLING_CADENCE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/payments";
import { formatDate, formatZar } from "@/lib/money";
import { calcDocumentTotals } from "@/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ContractsPage() {
  const { supabase } = await requireUser();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, clients(name, business_name), contract_lines(qty, unit_price)")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Recurring agreements that generate and email invoices automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RunBillingButton />
          <LinkButton href="/contracts/new">New contract</LinkButton>
        </div>
      </div>

      {!contracts?.length ? (
        <p className="text-sm text-muted-foreground">
          No contracts yet.{" "}
          <Link href="/contracts/new" className="underline">
            Create your first contract
          </Link>
          .
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Next bill</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => {
              const client = contract.clients as {
                name: string;
                business_name: string;
              } | null;
              const clientLabel =
                client?.business_name?.trim() || client?.name || "—";
              const totals = calcDocumentTotals(
                (contract.contract_lines ?? []).map((line) => ({
                  qty: Number(line.qty),
                  unit_price: Number(line.unit_price),
                  vat_rate: 0,
                })),
              );
              return (
                <TableRow key={contract.id}>
                  <TableCell>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="font-medium hover:underline"
                    >
                      {contract.title}
                    </Link>
                    {contract.auto_send ? (
                      <Badge variant="secondary" className="ml-2">
                        Auto-email
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{clientLabel}</TableCell>
                  <TableCell>
                    {CONTRACT_STATUS_LABELS[contract.status]}
                  </TableCell>
                  <TableCell>
                    {BILLING_CADENCE_LABELS[contract.cadence]}
                  </TableCell>
                  <TableCell>
                    {contract.next_bill_on
                      ? formatDate(contract.next_bill_on)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatZar(totals.total)}
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
