import { requireUser } from "@/lib/auth";
import { ContractForm } from "@/components/contracts/contract-form";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireUser();

  const [{ data: clients }, { data: catalogItems }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase
      .from("catalog_items")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New contract</h1>
        <p className="text-sm text-muted-foreground">
          Set up recurring billing for a client. Active contracts invoice on the
          next bill date and can email via Brevo.
        </p>
      </div>
      <ContractForm
        mode="create"
        clients={clients ?? []}
        catalogItems={catalogItems ?? []}
        defaultClientId={params.client_id}
      />
    </div>
  );
}
