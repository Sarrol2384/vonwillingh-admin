import { requireUser } from "@/lib/auth";
import { ItemsManager } from "@/components/items/items-manager";

export default async function ItemsPage() {
  const { supabase } = await requireUser();
  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .order("sort_order")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
        <p className="text-sm text-muted-foreground">
          Reusable services and products with prices. Pick them when creating
          quotes or invoices.
        </p>
      </div>
      <ItemsManager items={items ?? []} />
    </div>
  );
}
