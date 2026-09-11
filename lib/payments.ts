export const PAYMENT_METHOD_LABELS = {
  eft: "EFT",
  cash: "Cash",
  card: "Card",
  other: "Other",
} as const;

export const CONTRACT_STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
} as const;

export const BILLING_CADENCE_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
} as const;

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function moneyNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== "string") return 0;
  const normalised = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type ArSummary = {
  invoiced: number;
  received: number;
  outstanding: number;
};

/** Amount due = all non-void invoices minus all payments (allocated or not). */
export function calcArSummary(
  invoices: Array<{ total: number | string; status: string }>,
  payments: Array<{ amount: number | string }>,
): ArSummary {
  const invoiced = roundMoney(
    invoices
      .filter((invoice) => invoice.status !== "void")
      .reduce((sum, invoice) => sum + moneyNumber(invoice.total), 0),
  );
  const received = roundMoney(
    payments.reduce((sum, payment) => sum + moneyNumber(payment.amount), 0),
  );
  return {
    invoiced,
    received,
    outstanding: roundMoney(invoiced - received),
  };
}

export function calcOutstanding(
  invoices: Array<{ total: number | string; status: string }>,
  payments: Array<{ amount: number | string }>,
): number {
  return calcArSummary(invoices, payments).outstanding;
}

export function clientArRows(
  clients: Array<{
    id: string;
    name: string;
    business_name: string;
    email: string;
  }>,
  invoices: Array<{
    client_id: string;
    total: number | string;
    status: string;
  }>,
  payments: Array<{
    client_id: string;
    amount: number | string;
  }>,
): Array<{
  clientId: string;
  label: string;
  email: string;
  invoiced: number;
  received: number;
  outstanding: number;
}> {
  const invoicesByClient = new Map<string, typeof invoices>();
  for (const invoice of invoices) {
    const list = invoicesByClient.get(invoice.client_id) ?? [];
    list.push(invoice);
    invoicesByClient.set(invoice.client_id, list);
  }

  const paymentsByClient = new Map<string, typeof payments>();
  for (const payment of payments) {
    const list = paymentsByClient.get(payment.client_id) ?? [];
    list.push(payment);
    paymentsByClient.set(payment.client_id, list);
  }

  return clients
    .map((client) => {
      const summary = calcArSummary(
        invoicesByClient.get(client.id) ?? [],
        paymentsByClient.get(client.id) ?? [],
      );
      return {
        clientId: client.id,
        label: client.business_name?.trim() || client.name,
        email: client.email,
        ...summary,
      };
    })
    .sort(
      (a, b) => b.outstanding - a.outstanding || a.label.localeCompare(b.label),
    );
}

export function remainingByInvoice(
  invoices: Array<{ id: string; total: number | string; status: string }>,
  payments: Array<{ amount: number | string; document_id: string | null }>,
): Map<string, number> {
  const paidByInvoice = new Map<string, number>();
  for (const payment of payments) {
    if (!payment.document_id) continue;
    paidByInvoice.set(
      payment.document_id,
      roundMoney(
        (paidByInvoice.get(payment.document_id) ?? 0) +
          moneyNumber(payment.amount),
      ),
    );
  }

  const remaining = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.status === "void") continue;
    remaining.set(
      invoice.id,
      roundMoney(
        Math.max(
          0,
          moneyNumber(invoice.total) - (paidByInvoice.get(invoice.id) ?? 0),
        ),
      ),
    );
  }
  return remaining;
}
