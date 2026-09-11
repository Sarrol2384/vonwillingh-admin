import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import { formatDate, formatZar } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, roundMoney } from "@/lib/payments";
import { DocumentEditor } from "@/components/documents/document-editor";
import { DocumentActions } from "@/components/documents/document-actions";
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
} from "@/components/documents/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [
    { data: document },
    { data: clients },
    { data: catalogItems },
    { data: payments },
    { data: sends },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("*, document_lines(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("clients").select("*").order("name"),
    supabase
      .from("catalog_items")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("payments")
      .select("*")
      .eq("document_id", id)
      .order("paid_at", { ascending: false }),
    supabase
      .from("invoice_sends")
      .select("*")
      .eq("document_id", id)
      .order("sent_at", { ascending: false })
      .limit(5),
  ]);

  if (!document) notFound();

  const lines = document.document_lines ?? [];
  const paidTotal = roundMoney(
    (payments ?? []).reduce((sum, row) => sum + Number(row.amount), 0),
  );
  const balance = roundMoney(Math.max(0, Number(document.total) - paidTotal));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {document.number}
            </h1>
            <DocumentTypeBadge type={document.type} />
            <DocumentStatusBadge status={document.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Edit {DOCUMENT_TYPE_LABELS[document.type].toLowerCase()} details
          </p>
        </div>
        <DocumentActions document={document} />
      </div>

      {document.type === "invoice" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Invoice total</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatZar(Number(document.total))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Paid</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatZar(paidTotal)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Balance</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatZar(balance)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {document.type === "invoice" && (payments?.length || sends?.length) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {payments?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
                <CardDescription>Allocated to this invoice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>
                      {formatDate(payment.paid_at)} ·{" "}
                      {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                    <span className="tabular-nums font-medium">
                      {formatZar(Number(payment.amount))}
                    </span>
                  </div>
                ))}
                <Link
                  href={`/payments/new?client_id=${document.client_id}&document_id=${document.id}`}
                  className="inline-block text-sm underline"
                >
                  Record another payment
                </Link>
              </CardContent>
            </Card>
          ) : null}
          {sends?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Email history</CardTitle>
                <CardDescription>Brevo sends for this invoice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {sends.map((send) => (
                  <div key={send.id}>
                    {formatDate(send.sent_at)} · {send.to_email} ·{" "}
                    <span
                      className={
                        send.status === "sent"
                          ? "text-foreground"
                          : "text-destructive"
                      }
                    >
                      {send.status}
                    </span>
                    {send.error ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {send.error}
                      </span>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <DocumentEditor
        mode="edit"
        documentType={document.type}
        clients={clients ?? []}
        catalogItems={catalogItems ?? []}
        document={document}
        lines={lines}
      />
    </div>
  );
}
