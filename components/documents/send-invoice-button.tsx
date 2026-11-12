"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { createCreditNoteFromInvoice } from "@/lib/actions/documents";
import { sendInvoiceEmail } from "@/lib/actions/invoice-send";
import {
  describeInvoiceSend,
  describeInvoiceSent,
} from "@/lib/email/recipients";
import { formatDateTime, formatZar } from "@/lib/money";

export function SendInvoiceButton({
  documentId,
  clientId,
  number,
  total,
  recipients,
}: {
  documentId: string;
  clientId: string;
  number: string;
  total: number;
  recipients: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const amount = formatZar(total);
  const canSend = recipients.length > 0;
  const summary = describeInvoiceSend({ number, amount, recipients });

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusable = [
        ...node.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, pending]);

  function close() {
    if (pending) return;
    setOpen(false);
  }

  function confirmSend() {
    if (!canSend || pending) return;
    startTransition(async () => {
      const result = await sendInvoiceEmail(documentId, recipients);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const sentRecipients = result.recipients?.length
        ? result.recipients
        : recipients;
      const sentAmount = formatZar(result.total ?? total);
      const when = formatDateTime(result.sentAt ?? new Date().toISOString());
      setOpen(false);
      toast.success(
        `${describeInvoiceSent({
          number: result.number ?? number,
          amount: sentAmount,
          recipients: sentRecipients,
          when,
        })}.`,
        {
          duration: 12000,
          action: {
            label: "Issue a credit note",
            onClick: () => {
              startTransition(async () => {
                const created = await createCreditNoteFromInvoice(documentId);
                if (created && "ok" in created && !created.ok) {
                  toast.error(created.error);
                }
              });
            },
          },
        },
      );
    });
  }

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40"
        aria-label="Cancel"
        disabled={pending}
        onClick={close}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-xl bg-card p-4 text-card-foreground shadow-lg ring-1 ring-foreground/10 outline-none"
      >
        <h2 id={titleId} className="text-base font-medium">
          Email this invoice
        </h2>
        {canSend ? (
          <p id={descriptionId} className="mt-2 text-sm">
            {summary}.
          </p>
        ) : (
          <p id={descriptionId} className="mt-2 text-sm">
            Add an email address for this client before sending invoice {number}{" "}
            for {amount}.
          </p>
        )}
        {recipients.length > 1 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {recipients.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={close}>
            Cancel
          </Button>
          {canSend ? (
            <Button type="button" disabled={pending} onClick={confirmSend}>
              {pending ? "Sending…" : "Send invoice"}
            </Button>
          ) : (
            <LinkButton href={`/clients/${clientId}`}>Edit client</LinkButton>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        <Mail className="mr-1 h-4 w-4" />
        {pending ? "Sending…" : "Email invoice"}
      </Button>
      {open ? createPortal(dialog, document.body) : null}
    </>
  );
}
