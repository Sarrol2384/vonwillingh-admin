"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateDocumentStatus } from "@/lib/actions/documents";
import { statusesForType } from "@/lib/documents";
import type { DocumentStatus, DocumentType } from "@/lib/supabase/types";

const selectClassName =
  "h-8 min-w-[7rem] rounded-lg border border-input bg-transparent px-2 text-sm capitalize outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function DocumentStatusSelect({
  id,
  type,
  status,
}: {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const statuses = statusesForType(type);

  function handleChange(next: DocumentStatus) {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateDocumentStatus(id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Status updated to ${next}`);
      router.refresh();
    });
  }

  return (
    <select
      className={selectClassName}
      value={status}
      disabled={pending}
      aria-label="Document status"
      onChange={(e) => handleChange(e.target.value as DocumentStatus)}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
