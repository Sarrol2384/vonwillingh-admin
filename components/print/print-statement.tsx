import { hasBankDetails } from "@/lib/company";
import { formatDate, formatZar } from "@/lib/money";
import type { ClientStatement } from "@/lib/statements";
import type { CompanySettings } from "@/lib/supabase/types";
import {
  LetterheadFooter,
  LetterheadHeader,
} from "@/components/print/letterhead";

export function PrintStatement({
  statement,
  company,
}: {
  statement: ClientStatement;
  company: CompanySettings;
}) {
  const clientLabel =
    statement.client.business_name?.trim() || statement.client.name;

  return (
    <article className="letterhead-sheet mx-auto max-w-[210mm] text-[12px] print:max-w-none">
      <LetterheadHeader company={company} />

      <div className="letterhead-content">
        <div className="flex items-start justify-between gap-6 border-b border-[var(--lh-navy,#1a2a4e)]/20 pb-4">
          <div className="space-y-0.5 text-[var(--lh-muted,#5a6478)]">
            {company.contact_name ? (
              <p className="font-medium text-[var(--lh-ink,#1a2a4e)]">
                {company.contact_name}
              </p>
            ) : null}
            {company.registration_number ? (
              <p>Reg: {company.registration_number}</p>
            ) : null}
            {company.vat_number ? <p>VAT: {company.vat_number}</p> : null}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--lh-ink,#1a2a4e)]">
              Account statement
            </h1>
            <dl className="mt-3 space-y-1 text-[var(--lh-muted,#5a6478)]">
              <div>
                <dt className="inline">Period: </dt>
                <dd className="inline">
                  {formatDate(statement.from)} – {formatDate(statement.to)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[var(--lh-muted,#5a6478)] uppercase">
              Bill to
            </p>
            <p className="mt-1 font-medium text-[var(--lh-ink,#1a2a4e)]">
              {clientLabel}
            </p>
            {statement.client.name &&
            statement.client.business_name?.trim() ? (
              <p>{statement.client.name}</p>
            ) : null}
            {statement.client.email ? <p>{statement.client.email}</p> : null}
            {statement.client.address ? (
              <p className="whitespace-pre-wrap">{statement.client.address}</p>
            ) : null}
          </div>
          <div className="text-right sm:justify-self-end">
            <p className="text-xs font-semibold tracking-wide text-[var(--lh-muted,#5a6478)] uppercase">
              Amount due
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--lh-accent,#d9782e)]">
              {formatZar(statement.closingBalance)}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[var(--lh-ink,#1a2a4e)] text-left">
              <th className="py-2 pr-2 font-semibold">Date</th>
              <th className="py-2 pr-2 font-semibold">Description</th>
              <th className="py-2 pr-2 text-right font-semibold">Invoices</th>
              <th className="py-2 pr-2 text-right font-semibold">Payments</th>
              <th className="py-2 text-right font-semibold">Amount due</th>
            </tr>
          </thead>
          <tbody>
            {statement.lines.map((line, index) => (
              <tr
                key={`${line.kind}-${line.date}-${index}`}
                className="border-b border-[var(--lh-navy,#1a2a4e)]/15"
              >
                <td className="py-2 pr-2 align-top whitespace-nowrap">
                  {formatDate(line.date)}
                </td>
                <td className="py-2 pr-2 align-top">{line.description}</td>
                <td className="py-2 pr-2 text-right tabular-nums align-top">
                  {line.debit ? formatZar(line.debit) : ""}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums align-top">
                  {line.credit ? formatZar(line.credit) : ""}
                </td>
                <td className="py-2 text-right tabular-nums align-top font-medium">
                  {formatZar(line.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="min-w-[14rem] space-y-1 text-right">
            <div className="flex justify-between gap-8">
              <dt className="text-[var(--lh-muted,#5a6478)]">Opening</dt>
              <dd className="tabular-nums">
                {formatZar(statement.openingBalance)}
              </dd>
            </div>
            <div className="flex justify-between gap-8">
              <dt className="text-[var(--lh-muted,#5a6478)]">Invoiced</dt>
              <dd className="tabular-nums">
                {formatZar(statement.periodInvoiced)}
              </dd>
            </div>
            <div className="flex justify-between gap-8">
              <dt className="text-[var(--lh-muted,#5a6478)]">Paid</dt>
              <dd className="tabular-nums">
                {formatZar(statement.periodPaid)}
              </dd>
            </div>
            <div className="flex justify-between gap-8 border-t border-[var(--lh-ink,#1a2a4e)] pt-2 text-base font-semibold">
              <dt>Amount due</dt>
              <dd className="tabular-nums">
                {formatZar(statement.closingBalance)}
              </dd>
            </div>
          </dl>
        </div>

        {hasBankDetails(company) ? (
          <div className="mt-8 border-t border-[var(--lh-navy,#1a2a4e)]/20 pt-4 text-[var(--lh-muted,#5a6478)]">
            <p className="font-medium text-[var(--lh-ink,#1a2a4e)]">
              Bank details
            </p>
            <p>{company.bank_name}</p>
            <p>Account name: {company.bank_account_name}</p>
            <p>Account number: {company.bank_account_number}</p>
            <p>Branch code: {company.bank_branch_code}</p>
          </div>
        ) : null}
      </div>

      <LetterheadFooter company={company} />
    </article>
  );
}
