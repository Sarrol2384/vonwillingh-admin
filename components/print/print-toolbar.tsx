"use client";

import { Button } from "@/components/ui/button";

export function PrintToolbar() {
  return (
    <div className="no-print mb-6 flex items-center justify-between gap-3 border-b pb-4">
      <p className="text-sm text-muted-foreground">
        Open this page in Chrome or Edge, then Print → Save as PDF. Cursor’s
        built-in browser does not support print preview.
      </p>
      <Button type="button" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
