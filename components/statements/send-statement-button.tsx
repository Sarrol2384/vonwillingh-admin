"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendClientStatementEmail } from "@/lib/actions/statement-send";

export function SendStatementButton({
  clientId,
  from,
  to,
}: {
  clientId: string;
  from: string;
  to: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendClientStatementEmail({ clientId, from, to });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Statement emailed via Brevo");
    });
  }

  return (
    <Button variant="outline" disabled={pending} onClick={handleClick}>
      <Mail className="mr-1 h-4 w-4" />
      {pending ? "Sending…" : "Email statement"}
    </Button>
  );
}
