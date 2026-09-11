"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StatementRangeForm({
  clientId,
  from,
  to,
}: {
  clientId: string;
  from: string;
  to: string;
}) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nextFrom = String(formData.get("from") || from);
    const nextTo = String(formData.get("to") || to);
    const params = new URLSearchParams({ from: nextFrom, to: nextTo });
    router.push(`/clients/${clientId}/statement?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="from">From</Label>
        <Input id="from" name="from" type="date" defaultValue={from} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="to">To</Label>
        <Input id="to" name="to" type="date" defaultValue={to} required />
      </div>
      <Button type="submit">Update statement</Button>
    </form>
  );
}
