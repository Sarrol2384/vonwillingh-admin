"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient, updateClient, deleteClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/supabase/types";

export function ClientForm({
  mode,
  client,
}: {
  mode: "create" | "edit";
  client?: Client;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createClient(formData)
          : await updateClient(client!.id, formData);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
        return;
      }
      if (mode === "edit") toast.success("Client saved");
    });
  }

  function handleDelete() {
    if (!client) return;
    if (!confirm(`Delete ${client.name}?`)) return;
    startTransition(async () => {
      const result = await deleteClient(client.id);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="business_name">Business name</Label>
        <Input
          id="business_name"
          name="business_name"
          defaultValue={client?.business_name}
          placeholder="e.g. Sweet Victory Funerals"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Contact name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={client?.name}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={client?.email}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={client?.phone} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={client?.address}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vat_number">VAT number</Label>
        <Input
          id="vat_number"
          name="vat_number"
          defaultValue={client?.vat_number}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={client?.notes} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create client" : "Save"}
        </Button>
        {mode === "edit" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
