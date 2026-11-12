import { IssueCreditNoteButton } from "@/components/documents/issue-credit-note-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  describeInvoiceSent,
  parseRecipientEmails,
} from "@/lib/email/recipients";
import { formatDateTime, formatZar } from "@/lib/money";
import type { InvoiceSend } from "@/lib/supabase/types";

export function InvoiceEmailHistory({
  documentId,
  number,
  total,
  sends,
}: {
  documentId: string;
  number: string;
  total: number;
  sends: InvoiceSend[];
}) {
  const latestDelivered = sends.find((send) => send.status === "sent") ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email history</CardTitle>
        <CardDescription>Brevo sends for this invoice</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {latestDelivered ? (
          <p>
            {describeInvoiceSent({
              number,
              amount: formatZar(total),
              recipients: parseRecipientEmails(latestDelivered.to_email),
              when: formatDateTime(latestDelivered.sent_at),
            })}
            .
          </p>
        ) : (
          <p className="text-muted-foreground">
            This invoice has not been emailed yet.
          </p>
        )}
        {sends.length > 0 ? (
          <div className="space-y-2">
            {sends.map((send) => (
              <div key={send.id}>
                {formatDateTime(send.sent_at)} · {send.to_email} ·{" "}
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
                  <span className="text-muted-foreground"> — {send.error}</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {latestDelivered ? (
          <div className="space-y-1">
            <p className="text-muted-foreground">
              If this invoice should not have been sent, issue a credit note.
            </p>
            <IssueCreditNoteButton documentId={documentId} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
