import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ClientForm } from "@/components/clients/client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
        <p className="text-sm text-muted-foreground">Edit client details</p>
      </div>
      <ClientForm mode="edit" client={client} />
    </div>
  );
}
