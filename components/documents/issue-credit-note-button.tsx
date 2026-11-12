"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createCreditNoteFromInvoice } from "@/lib/actions/documents";

export function IssueCreditNoteButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await createCreditNoteFromInvoice(documentId);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      className="inline-block text-sm underline disabled:opacity-50"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? "Creating credit note…" : "Issue a credit note"}
    </button>
  );
}
