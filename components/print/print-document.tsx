import { hasBankDetails } from "@/lib/company";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import {
  calcDocumentTotals,
  calcLineTotals,
  formatDate,
  formatZar,
} from "@/lib/money";
import type {
  Client,
  CompanySettings,
  Document,
  DocumentLine,
} from "@/lib/supabase/types";

export function PrintDocument({
  document,
  client,
  lines,
  company,
}: {
  document: Document;
  client: Client;
  lines: DocumentLine[];
  company: CompanySettings;
}) {
  const sorted = [...lines].sort((a, b) => a.sort_order - b.sort_order);
  const totals = calcDocumentTotals(
    sorted.map((line) => ({
      qty: Number(line.qty),
      unit_price: Number(line.unit_price),
      vat_rate: 0,
    })),
  );
  const title = DOCUMENT_TYPE_LABELS[document.type];
  const showValidity =
    document.type === "quote" && Boolean(document.due_or_valid_until);

  return (
    <article className="mx-auto max-w-[210mm] bg-white text-[12px] text-neutral-900 print:max-w-none">
      <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt={company.company_name}
            className="h-28 w-auto"
          />
          <div className="mt-3 space-y-0.5 text-neutral-600">
            <p className="font-semibold text-neutral-900">{company.company_name}</p>
            <p>{company.contact_name}</p>
            <p className="whitespace-pre-line">{company.address}</p>
            <p>{company.email}</p>
            <p>{company.phone}</p>
            {company.website ? <p>{company.website}</p> : null}
            {company.registration_number ? (
              <p>Reg: {company.registration_number}</p>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold tracking-tight text-[#1e3a5f]">
            {title}
          </h1>
          <p className="mt-2 text-base font-semibold">{document.number}</p>
          <dl className="mt-3 space-y-1 text-neutral-600">
            <div>
              <dt className="inline text-neutral-500">Issue date: </dt>
              <dd className="inline">{formatDate(document.issue_date)}</dd>
            </div>
            {showValidity ? (
              <div>
                <dt className="inline text-neutral-500">Valid until: </dt>
                <dd className="inline">
                  {formatDate(document.due_or_valid_until)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </header>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Bill to
          </h2>
          <p className="mt-1 font-semibold">
            {client.business_name?.trim() || client.name}
          </p>
          {client.business_name?.trim() && client.name ? (
            <p className="text-neutral-600">Attn: {client.name}</p>
          ) : null}
          {client.address ? (
            <p className="whitespace-pre-line text-neutral-600">{client.address}</p>
          ) : null}
          {client.email ? <p className="text-neutral-600">{client.email}</p> : null}
          {client.phone ? <p className="text-neutral-600">{client.phone}</p> : null}
        </div>
      </section>

      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-[#1e3a5f] text-left">
            <th className="py-2 pr-2 font-semibold">Description</th>
            <th className="w-16 py-2 pr-2 text-right font-semibold">Qty</th>
            <th className="w-24 py-2 pr-2 text-right font-semibold">Unit</th>
            <th className="w-28 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((line) => {
            const t = calcLineTotals({ ...line, vat_rate: 0 });
            return (
              <tr key={line.id} className="border-b border-neutral-200 align-top">
                <td className="py-2 pr-2 whitespace-pre-wrap">
                  <div>{line.description}</div>
                  {line.done_date ? (
                    <div className="mt-0.5 text-neutral-500">
                      Done: {formatDate(line.done_date)}
                    </div>
                  ) : null}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{line.qty}</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {formatZar(Number(line.unit_price))}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatZar(t.line_excl)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-64 space-y-1">
          <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatZar(totals.total)}</dd>
          </div>
        </dl>
      </div>

      {document.notes ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Notes
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-neutral-700">{document.notes}</p>
        </section>
      ) : null}

      {document.type === "invoice" || document.type === "credit_note" ? (
        <section className="mt-8 rounded border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Banking details
          </h2>
          {hasBankDetails(company) ? (
            <dl className="mt-2 grid gap-1 sm:grid-cols-2">
              {company.bank_name ? (
                <div>
                  <dt className="inline text-neutral-500">Bank: </dt>
                  <dd className="inline">{company.bank_name}</dd>
                </div>
              ) : null}
              {company.bank_account_name ? (
                <div>
                  <dt className="inline text-neutral-500">Account name: </dt>
                  <dd className="inline">{company.bank_account_name}</dd>
                </div>
              ) : null}
              {company.bank_account_number ? (
                <div>
                  <dt className="inline text-neutral-500">Account number: </dt>
                  <dd className="inline">{company.bank_account_number}</dd>
                </div>
              ) : null}
              {company.bank_branch_code ? (
                <div>
                  <dt className="inline text-neutral-500">Branch code: </dt>
                  <dd className="inline">{company.bank_branch_code}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-neutral-600 italic">
              Bank details not configured — add them under Settings.
            </p>
          )}
        </section>
      ) : null}

      <footer className="mt-10 border-t border-neutral-200 pt-3 text-neutral-500">
        <p>Thank you for your business.</p>
      </footer>
    </article>
  );
}
