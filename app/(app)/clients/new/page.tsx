import { ClientForm } from "@/components/clients/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
        <p className="text-sm text-muted-foreground">
          Add billing details for a customer.
        </p>
      </div>
      <ClientForm mode="create" />
    </div>
  );
}
