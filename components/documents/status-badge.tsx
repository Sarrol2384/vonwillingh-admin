import { Badge } from "@/components/ui/badge";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/documents";
import type { DocumentStatus, DocumentType } from "@/lib/supabase/types";

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  return <Badge variant="secondary">{DOCUMENT_TYPE_LABELS[type]}</Badge>;
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const variant =
    status === "paid" || status === "accepted" || status === "issued"
      ? "default"
      : status === "void" || status === "declined"
        ? "destructive"
        : status === "draft"
          ? "outline"
          : "secondary";

  return <Badge variant={variant}>{DOCUMENT_STATUS_LABELS[status]}</Badge>;
}
