"use client";

import { useId, useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { prepareInvoiceWhatsAppLink } from "@/lib/actions/invoice-whatsapp";
import { cn } from "@/lib/utils";

const OPEN_TITLE =
  "Opens WhatsApp with the message filled in. You still press Send.";

export function SendWhatsAppButton({
  documentId,
  href,
  settled,
  hint,
  hintOnOwnRow = false,
  className,
}: {
  documentId: string;
  href: string | null;
  settled: boolean;
  hint: string | null;
  /** In a horizontal button row, put the phone hint on the following line. */
  hintOnOwnRow?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [createdHref, setCreatedHref] = useState<string | null>(null);
  const readyHref = href ?? createdHref;
  const hintId = useId();
  const label = settled ? "Send receipt via WhatsApp" : "Send via WhatsApp";
  const describedBy = hint ? hintId : undefined;

  function openDraft(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (pending) return;
    const popup = window.open("about:blank", "_blank");
    let opened = false;
    startTransition(async () => {
      try {
        const result = await prepareInvoiceWhatsAppLink(documentId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        opened = true;
        setCreatedHref(result.href);
        if (popup && !popup.closed) {
          popup.location.href = result.href;
          return;
        }
        window.location.assign(result.href);
      } catch {
        toast.error("Could not open WhatsApp. Try again.");
      } finally {
        if (!opened) popup?.close();
      }
    });
  }

  const icon = (
    <MessageCircle className="mr-1 h-4 w-4 text-emerald-800" aria-hidden="true" />
  );

  return (
    <>
      {readyHref ? (
        <a
          href={readyHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), className)}
          title={hint ?? OPEN_TITLE}
          aria-describedby={describedBy}
        >
          {icon}
          {label}
        </a>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={openDraft}
          title={hint ?? OPEN_TITLE}
          aria-describedby={describedBy}
          className={className}
        >
          {icon}
          {pending ? "Opening WhatsApp…" : label}
        </Button>
      )}
      {hint ? (
        <p
          id={hintId}
          className={cn(
            "text-xs whitespace-normal text-muted-foreground",
            hintOnOwnRow
              ? "basis-full max-w-md"
              : "max-w-[8.75rem] sm:max-w-56",
          )}
        >
          {hint}
        </p>
      ) : null}
    </>
  );
}
