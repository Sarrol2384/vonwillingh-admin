import { PAYMENT_METHOD_LABELS, moneyNumber, roundMoney } from "@/lib/payments";
import { todayIsoDate } from "@/lib/money";
import type { Client, Payment } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type StatementLineKind = "opening" | "invoice" | "payment";

export type StatementLine = {
  kind: StatementLineKind;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  documentId?: string;
  paymentId?: string;
};

export type ClientStatement = {
  client: Client;
  from: string;
  to: string;
  openingBalance: number;
  periodInvoiced: number;
  periodPaid: number;
  closingBalance: number;
  lines: StatementLine[];
};

type InvoiceRow = {
  id: string;
  number: string;
  total: number;
  issue_date: string;
  status: string;
};

type PaymentRow = Pick<
  Payment,
  "id" | "amount" | "paid_at" | "method" | "reference" | "document_id"
> & {
  documents?: { number: string } | null;
};

export function defaultStatementRange(today = todayIsoDate()): {
  from: string;
  to: string;
} {
  const [year, month] = today.split("-");
  return {
    from: `${year}-${month}-01`,
    to: today,
  };
}

export function toIsoDate(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? raw.slice(0, 10);
}

export function parseStatementRange(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined,
): { from: string; to: string } | { error: string } {
  const defaults = defaultStatementRange();
  const from = toIsoDate(fromRaw?.trim() || defaults.from);
  const to = toIsoDate(toRaw?.trim() || defaults.to);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { error: "Invalid date range" };
  }
  if (from > to) {
    return { error: "From date must be on or before to date" };
  }
  return { from, to };
}

function paymentDescription(payment: PaymentRow): string {
  const method =
    PAYMENT_METHOD_LABELS[payment.method] ?? payment.method.toUpperCase();
  const invoiceNumber = payment.documents?.number;
  const ref = payment.reference?.trim();
  const parts = [`Payment (${method})`];
  if (invoiceNumber) parts.push(`for ${invoiceNumber}`);
  if (ref) parts.push(`ref ${ref}`);
  return parts.join(" — ");
}

export function buildStatementLedger(args: {
  client: Client;
  from: string;
  to: string;
  invoices: InvoiceRow[];
  payments: PaymentRow[];
}): ClientStatement {
  const { client, from, to, invoices, payments } = args;

  const openingInvoiced = roundMoney(
    invoices
      .filter((inv) => toIsoDate(inv.issue_date) < from)
      .reduce((sum, inv) => sum + moneyNumber(inv.total), 0),
  );
  const openingPaid = roundMoney(
    payments
      .filter((p) => toIsoDate(p.paid_at) < from)
      .reduce((sum, p) => sum + moneyNumber(p.amount), 0),
  );
  const openingBalance = roundMoney(openingInvoiced - openingPaid);

  const periodInvoices = invoices.filter((inv) => {
    const date = toIsoDate(inv.issue_date);
    return date >= from && date <= to;
  });
  const periodPayments = payments.filter((p) => {
    const date = toIsoDate(p.paid_at);
    return date >= from && date <= to;
  });

  const periodInvoiced = roundMoney(
    periodInvoices.reduce((sum, inv) => sum + moneyNumber(inv.total), 0),
  );
  const periodPaid = roundMoney(
    periodPayments.reduce((sum, p) => sum + moneyNumber(p.amount), 0),
  );
  const closingBalance = roundMoney(
    openingBalance + periodInvoiced - periodPaid,
  );

  type Event = {
    sortDate: string;
    sortKey: string;
    line: Omit<StatementLine, "balance">;
  };

  const events: Event[] = [];

  for (const inv of periodInvoices) {
    events.push({
      sortDate: toIsoDate(inv.issue_date),
      sortKey: `i-${inv.number}`,
      line: {
        kind: "invoice",
        date: toIsoDate(inv.issue_date),
        description: `Invoice ${inv.number}`,
        debit: roundMoney(moneyNumber(inv.total)),
        credit: 0,
        documentId: inv.id,
      },
    });
  }

  for (const payment of periodPayments) {
    events.push({
      sortDate: toIsoDate(payment.paid_at),
      sortKey: `p-${payment.id}`,
      line: {
        kind: "payment",
        date: toIsoDate(payment.paid_at),
        description: paymentDescription(payment),
        debit: 0,
        credit: roundMoney(moneyNumber(payment.amount)),
        paymentId: payment.id,
        documentId: payment.document_id ?? undefined,
      },
    });
  }

  events.sort((a, b) => {
    if (a.sortDate !== b.sortDate) return a.sortDate.localeCompare(b.sortDate);
    return a.sortKey.localeCompare(b.sortKey);
  });

  const lines: StatementLine[] = [
    {
      kind: "opening",
      date: from,
      description: "Opening balance",
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? roundMoney(-openingBalance) : 0,
      balance: openingBalance,
    },
  ];

  let running = openingBalance;
  for (const event of events) {
    running = roundMoney(running + event.line.debit - event.line.credit);
    lines.push({
      ...event.line,
      balance: running,
    });
  }

  return {
    client,
    from,
    to,
    openingBalance,
    periodInvoiced,
    periodPaid,
    closingBalance,
    lines,
  };
}

export async function loadClientStatement(
  supabase: SupabaseClient<Database>,
  clientId: string,
  from: string,
  to: string,
): Promise<ClientStatement | { error: string }> {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !client) {
    return { error: clientError?.message ?? "Client not found" };
  }

  const [{ data: invoices, error: invError }, { data: payments, error: payError }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id, number, total, issue_date, status")
        .eq("client_id", clientId)
        .eq("type", "invoice")
        .neq("status", "void")
        .lte("issue_date", to)
        .order("issue_date", { ascending: true }),
      supabase
        .from("payments")
        .select("id, amount, paid_at, method, reference, document_id, documents(number)")
        .eq("client_id", clientId)
        .lte("paid_at", to)
        .order("paid_at", { ascending: true }),
    ]);

  if (invError) return { error: invError.message };
  if (payError) return { error: payError.message };

  return buildStatementLedger({
    client,
    from,
    to,
    invoices: (invoices ?? []) as InvoiceRow[],
    payments: (payments ?? []) as PaymentRow[],
  });
}
