"use client";

import { useTransition } from "react";
import { createDefaultClientDocument } from "@/lib/actions/client-documents";
import { Button } from "@/components/ui/button";

export function CreateClientDocumentButton({
  clientId,
  type,
  label,
  variant = "outline",
}: {
  clientId: string;
  type: "service_agreement" | "discovery_brief";
  label: string;
  variant?: "default" | "outline" | "accent";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await createDefaultClientDocument(clientId, type);
        })
      }
    >
      {pending ? "Creating…" : label}
    </Button>
  );
}
