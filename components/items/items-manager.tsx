"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { CatalogItemForm } from "@/components/items/catalog-item-form";
import { Button } from "@/components/ui/button";
import { formatZar } from "@/lib/money";
import { seedCatalogFromWebsite } from "@/lib/actions/catalog-items";
import type { CatalogItem } from "@/lib/supabase/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ItemsManager({ items }: { items: CatalogItem[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [seeding, startSeed] = useTransition();

  function handleImportWebsite() {
    startSeed(async () => {
      const result = await seedCatalogFromWebsite();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Imported ${result.added} item${result.added === 1 ? "" : "s"}` +
          (result.skipped
            ? ` (${result.skipped} already present)`
            : ""),
      );
      refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Website catalog</h2>
          <p className="text-sm text-muted-foreground">
            Import packages, care plans, cloud plans, and add-ons from the
            current website price list. Existing names are skipped.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={seeding}
          onClick={handleImportWebsite}
        >
          {seeding ? "Importing…" : "Import website packages"}
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Add item</h2>
        <CatalogItemForm mode="create" onDone={refresh} />
      </section>

      {!items.length ? (
        <p className="text-sm text-muted-foreground">
          No catalog items yet. Add services or products with prices so you can
          pick them on quotes and invoices, or import the website packages
          above.
        </p>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatZar(Number(item.unit_price))}
                  </TableCell>
                  <TableCell>
                    {item.active ? (
                      <span className="text-sm text-muted-foreground">Active</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Inactive</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="space-y-6">
            {items.map((item) => (
              <section
                key={item.id}
                className="space-y-3 rounded-lg border p-4"
              >
                <h2 className="text-sm font-medium">Edit: {item.name}</h2>
                <CatalogItemForm mode="edit" item={item} onDone={refresh} />
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
