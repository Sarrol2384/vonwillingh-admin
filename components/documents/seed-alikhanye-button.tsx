"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { seedAlikhanyeQuote } from "@/lib/actions/seed-alikhanye";
import { Button } from "@/components/ui/button";

export function SeedAlikhanyeButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  function onCreate() {
    setLocalError(null);
    startTransition(async () => {
      const result = await seedAlikhanyeQuote();
      if (!result.ok) {
        setLocalError(result.error);
        return;
      }
      router.push(`/documents/${result.id}/print`);
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border bg-card p-8 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Alikhanye Properties quotation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Creates (or opens) the Starter Website special quote — R1,999 once-off
          — on the VonWillingh letterhead.
        </p>
      </div>

      {(error || localError) && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError ?? error}
        </p>
      )}

      <Button type="button" disabled={pending} onClick={onCreate}>
        {pending ? "Creating quotation…" : "Create / open quotation"}
      </Button>

      <p className="text-xs text-muted-foreground">
        First click can take a few seconds while Supabase saves the client and
        lines. You will then be sent to the print view.
      </p>
    </div>
  );
}
