"use client";

import { Button } from "@/components/ui/button";

export function PrintToolbar() {
  return (
    <div className="no-print mb-6 flex items-center justify-between gap-3 border-b pb-4">
      <p className="text-sm text-muted-foreground">
        Use your browser print dialog and choose “Save as PDF” if needed.
      </p>
      <Button type="button" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
