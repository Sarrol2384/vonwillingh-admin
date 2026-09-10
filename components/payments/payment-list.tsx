"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deletePayment } from "@/lib/actions/payments";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { formatDate, formatZar } from "@/lib/money";
import type { Payment } from "@/lib/supabase/types";

type PaymentRow = Payment & {
  clients?: { name: string; business_name: string } | null;
  documents?: { number: string } | null;
};

export function PaymentList({ payments }: { payments: PaymentRow[] }) {
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Delete this payment?")) return;
    startTransition(async () => {
      const result = await deletePayment(id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Payment deleted");
    });
  }

  if (!payments.length) {
    return (
      <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => {
          const clientLabel =
            payment.clients?.business_name?.trim() ||
            payment.clients?.name ||
            "—";
          return (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.paid_at)}</TableCell>
              <TableCell>
                <Link
                  href={`/clients/${payment.client_id}`}
                  className="hover:underline"
                >
                  {clientLabel}
                </Link>
              </TableCell>
              <TableCell>
                {payment.document_id && payment.documents?.number ? (
                  <Link
                    href={`/documents/${payment.document_id}`}
                    className="hover:underline"
                  >
                    {payment.documents.number}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
              </TableCell>
              <TableCell>{payment.reference || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatZar(Number(payment.amount))}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleDelete(payment.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
