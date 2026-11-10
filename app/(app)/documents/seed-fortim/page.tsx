import { Suspense } from "react";
import { SeedFortimButton } from "@/components/documents/seed-fortim-button";

export default function SeedFortimQuotePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading…</p>
      }
    >
      <SeedFortimButton />
    </Suspense>
  );
}
