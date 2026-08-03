"use client";

import { useRouter } from "next/navigation";
import { CatalogItemForm } from "@/components/items/catalog-item-form";
import { formatZar } from "@/lib/money";
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

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Add item</h2>
        <CatalogItemForm mode="create" onDone={refresh} />
      </section>

      {!items.length ? (
        <p className="text-sm text-muted-foreground">
          No catalog items yet. Add services or products with prices so you can
          pick them on quotes and invoices.
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
