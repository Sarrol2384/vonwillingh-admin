"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPayment } from "@/lib/actions/payments";
import { PAYMENT_METHOD_LABELS, roundMoney } from "@/lib/payments";
import { formatZar, todayIsoDate } from "@/lib/money";
import type { Client, Document } from "@/lib/supabase/types";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PaymentForm({
  clients,
  invoices = [],
  paidByInvoice = {},
  defaultClientId,
  defaultDocumentId,
  redirectTo,
}: {
  clients: Client[];
  invoices?: Array<
    Pick<Document, "id" | "number" | "total" | "client_id" | "status">
  >;
  paidByInvoice?: Record<string, number>;
  defaultClientId?: string;
  defaultDocumentId?: string;
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [documentId, setDocumentId] = useState(defaultDocumentId ?? "");
  const [amount, setAmount] = useState("");

  const clientInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          (!clientId || invoice.client_id === clientId) &&
          invoice.status !== "void",
      ),
    [invoices, clientId],
  );

  function balanceFor(invoiceId: string, total: number) {
    const paid = paidByInvoice[invoiceId] ?? 0;
    return roundMoney(Math.max(0, Number(total) - paid));
  }

  function handleInvoiceChange(nextDocumentId: string) {
    setDocumentId(nextDocumentId);
    if (!nextDocumentId) return;
    const invoice = clientInvoices.find((row) => row.id === nextDocumentId);
    if (!invoice) return;
    const balance = balanceFor(invoice.id, Number(invoice.total));
    if (balance > 0) setAmount(String(balance));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("client_id", clientId);
    formData.set("document_id", documentId);
    formData.set("amount", amount);
    startTransition(async () => {
      const result = await createPayment(formData);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment recorded");
      e.currentTarget.reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {redirectTo ? (
        <input type="hidden" name="redirect_to" value={redirectTo} />
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="client_id">Client</Label>
        <select
          id="client_id"
          className={selectClassName}
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setDocumentId("");
            setAmount("");
          }}
          required
        >
          <option value="">Select client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.business_name?.trim()
                ? `${client.business_name} (${client.name})`
                : client.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="document_id">Invoice</Label>
        <select
          id="document_id"
          className={selectClassName}
          value={documentId}
          onChange={(e) => handleInvoiceChange(e.target.value)}
          required
          disabled={!clientId}
        >
          <option value="">Select invoice to allocate</option>
          {clientInvoices.map((invoice) => {
            const balance = balanceFor(invoice.id, Number(invoice.total));
            return (
              <option key={invoice.id} value={invoice.id}>
                {invoice.number} — due {formatZar(balance)} of{" "}
                {formatZar(Number(invoice.total))} ({invoice.status})
              </option>
            );
          })}
        </select>
        <p className="text-xs text-muted-foreground">
          Allocate the payment to an invoice so outstanding decreases.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (ZAR)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paid_at">Paid on</Label>
          <Input
            id="paid_at"
            name="paid_at"
            type="date"
            defaultValue={todayIsoDate()}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            name="method"
            className={selectClassName}
            defaultValue="eft"
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" name="reference" placeholder="Bank ref / receipt" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Record payment"}
      </Button>
    </form>
  );
}
