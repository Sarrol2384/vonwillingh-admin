"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { SendInvoiceButton } from "@/components/documents/send-invoice-button";
import {
  convertQuoteToInvoice,
  deleteDocument,
  duplicateDocument,
  updateDocumentStatus,
} from "@/lib/actions/documents";
import type { Document, DocumentStatus, DocumentType } from "@/lib/supabase/types";
import { statusesForType } from "@/lib/documents";

export function DocumentActions({ document }: { document: Document }) {
  const [pending, startTransition] = useTransition();
  const statuses = statusesForType(document.type as DocumentType);

  function setStatus(status: DocumentStatus) {
    startTransition(async () => {
      const result = await updateDocumentStatus(document.id, status);
      if (!result.ok) toast.error(result.error);
      else toast.success(`Marked as ${status}`);
    });
  }

  function handleConvert() {
    startTransition(async () => {
      const result = await convertQuoteToInvoice(document.id);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateDocument(document.id);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${document.number}?`)) return;
    startTransition(async () => {
      const result = await deleteDocument(document.id);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <LinkButton href={`/documents/${document.id}/print`} variant="outline">
        <Printer className="mr-1 h-4 w-4" />
        Print / PDF
      </LinkButton>
      {document.type === "invoice" && document.status !== "void" ? (
        <SendInvoiceButton documentId={document.id} />
      ) : null}
      {document.type === "invoice" && document.status !== "void" ? (
        <LinkButton
          href={`/payments/new?client_id=${document.client_id}&document_id=${document.id}`}
          variant="outline"
        >
          Record payment
        </LinkButton>
      ) : null}
      <Button variant="outline" disabled={pending} onClick={handleDuplicate}>
        <Copy className="mr-1 h-4 w-4" />
        Duplicate
      </Button>
      {document.type === "quote" && document.status !== "void" ? (
        <Button variant="accent" disabled={pending} onClick={handleConvert}>
          Convert to invoice
        </Button>
      ) : null}
      <select
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        value={document.status}
        disabled={pending}
        onChange={(e) => setStatus(e.target.value as DocumentStatus)}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button variant="destructive" disabled={pending} onClick={handleDelete}>
        Delete
      </Button>
    </div>
  );
}
