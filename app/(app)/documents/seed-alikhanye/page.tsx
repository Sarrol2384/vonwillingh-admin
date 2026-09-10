import { Suspense } from "react";
import { SeedAlikhanyeButton } from "@/components/documents/seed-alikhanye-button";

export default function SeedAlikhanyeQuotePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading…</p>
      }
    >
      <SeedAlikhanyeButton />
    </Suspense>
  );
}
