"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from "@/lib/actions/catalog-items";
import type { CatalogItem } from "@/lib/supabase/types";

export function CatalogItemForm({
  mode,
  item,
  onDone,
}: {
  mode: "create" | "edit";
  item?: CatalogItem;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCatalogItem(formData)
          : await updateCatalogItem(item!.id, formData);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Item added" : "Item saved");
      if (mode === "create") {
        (e.target as HTMLFormElement).reset();
      }
      onDone?.();
    });
  }

  function handleDelete() {
    if (!item) return;
    if (!confirm(`Delete “${item.name}”?`)) return;
    startTransition(async () => {
      const result = await deleteCatalogItem(item.id);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Item deleted");
      onDone?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor={`name-${item?.id ?? "new"}`}>Name</Label>
          <Input
            id={`name-${item?.id ?? "new"}`}
            name="name"
            defaultValue={item?.name}
            placeholder="e.g. Labour — hourly"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`unit_price-${item?.id ?? "new"}`}>Unit price</Label>
          <Input
            id={`unit_price-${item?.id ?? "new"}`}
            name="unit_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={item?.unit_price ?? 0}
            required
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-0.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              value="true"
              defaultChecked={item?.active ?? true}
              className="size-4 rounded border"
            />
            Active
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Add item" : "Save"}
          </Button>
          {mode === "edit" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
