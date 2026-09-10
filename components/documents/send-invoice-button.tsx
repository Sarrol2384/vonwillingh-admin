"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendInvoiceEmail } from "@/lib/actions/invoice-send";

export function SendInvoiceButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendInvoiceEmail(documentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice emailed via Brevo");
    });
  }

  return (
    <Button variant="outline" disabled={pending} onClick={handleClick}>
      <Mail className="mr-1 h-4 w-4" />
      {pending ? "Sending…" : "Email invoice"}
    </Button>
  );
}
