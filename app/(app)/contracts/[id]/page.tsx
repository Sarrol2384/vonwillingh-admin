import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ContractForm } from "@/components/contracts/contract-form";
import { RunBillingButton } from "@/components/contracts/run-billing-button";
import {
  BILLING_CADENCE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/payments";
import { formatDate } from "@/lib/money";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [
    { data: contract },
    { data: clients },
    { data: catalogItems },
    { data: invoices },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select("*, contract_lines(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("clients").select("*").order("name"),
    supabase
      .from("catalog_items")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("documents")
      .select("id, number, issue_date, status, total")
      .eq("contract_id", id)
      .order("issue_date", { ascending: false })
      .limit(20),
  ]);

  if (!contract) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {contract.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {CONTRACT_STATUS_LABELS[contract.status]} ·{" "}
            {BILLING_CADENCE_LABELS[contract.cadence]}
            {contract.next_bill_on
              ? ` · Next bill ${formatDate(contract.next_bill_on)}`
              : ""}
          </p>
        </div>
        {contract.status === "active" ? (
          <RunBillingButton
            contractId={contract.id}
            label="Bill this contract now"
          />
        ) : null}
      </div>

      <ContractForm
        mode="edit"
        clients={clients ?? []}
        catalogItems={catalogItems ?? []}
        contract={contract}
        lines={contract.contract_lines ?? []}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Generated invoices
        </h2>
        {!invoices?.length ? (
          <p className="text-sm text-muted-foreground">
            No invoices generated from this contract yet.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/documents/${invoice.id}`}
                  className="font-medium hover:underline"
                >
                  {invoice.number}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {formatDate(invoice.issue_date)} · {invoice.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
