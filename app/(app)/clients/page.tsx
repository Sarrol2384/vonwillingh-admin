import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ClientsPage() {
  const { supabase } = await requireUser();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            People and businesses you bill.
          </p>
        </div>
        <LinkButton href="/clients/new">New client</LinkButton>
      </div>

      {!clients?.length ? (
        <p className="text-sm text-muted-foreground">
          No clients yet.{" "}
          <Link href="/clients/new" className="underline">
            Add your first client
          </Link>
          .
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>VAT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium hover:underline"
                  >
                    {client.business_name?.trim() || client.name}
                  </Link>
                </TableCell>
                <TableCell>{client.business_name?.trim() ? client.name : "—"}</TableCell>
                <TableCell>{client.email || "—"}</TableCell>
                <TableCell>{client.phone || "—"}</TableCell>
                <TableCell>{client.vat_number || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
