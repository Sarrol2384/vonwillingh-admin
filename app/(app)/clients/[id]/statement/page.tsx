import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  loadClientStatement,
  parseStatementRange,
} from "@/lib/statements";
import { StatementRangeForm } from "@/components/statements/statement-range-form";
import { StatementView } from "@/components/statements/statement-view";
import { SendStatementButton } from "@/components/statements/send-statement-button";
import { LinkButton } from "@/components/ui/link-button";

export default async function ClientStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase } = await requireUser();

  const range = parseStatementRange(query.from, query.to);
  if ("error" in range) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Statement</h1>
        <p className="text-sm text-destructive">{range.error}</p>
      </div>
    );
  }

  const statement = await loadClientStatement(
    supabase,
    id,
    range.from,
    range.to,
  );
  if ("error" in statement) notFound();

  const clientLabel =
    statement.client.business_name?.trim() || statement.client.name;
  const printHref = `/clients/${id}/statement/print?from=${range.from}&to=${range.to}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Statement — {clientLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Account activity for the selected date range.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={printHref} variant="outline">
            <Printer className="mr-1 h-4 w-4" />
            Print / PDF
          </LinkButton>
          <SendStatementButton
            clientId={id}
            from={range.from}
            to={range.to}
          />
          <LinkButton href={`/clients/${id}`} variant="ghost">
            Back to client
          </LinkButton>
        </div>
      </div>

      <StatementRangeForm
        clientId={id}
        from={range.from}
        to={range.to}
      />

      <StatementView statement={statement} />

      {!statement.client.email?.trim() ? (
        <p className="text-sm text-muted-foreground">
          Add an email on the client record to send this statement via Brevo.
        </p>
      ) : null}
    </div>
  );
}
