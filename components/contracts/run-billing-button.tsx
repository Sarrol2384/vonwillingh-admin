"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runBillingNow } from "@/lib/actions/contracts";

export function RunBillingButton({
  contractId,
  label = "Run billing now",
}: {
  contractId?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const formData = new FormData();
      if (contractId) formData.set("contract_id", contractId);
      const result = await runBillingNow(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.summary);
    });
  }

  return (
    <Button variant="outline" disabled={pending} onClick={handleClick}>
      {pending ? "Running…" : label}
    </Button>
  );
}
