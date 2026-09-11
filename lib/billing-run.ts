import "server-only";

import {
  addBillingPeriod,
  dueDateFromTerms,
  invoiceNotesForContract,
  newPublicToken,
  totalsFromLines,
} from "@/lib/billing";
import { sendInvoiceEmailInternal } from "@/lib/actions/invoice-send";
import { todayIsoDate } from "@/lib/money";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contract, Database, DocumentType } from "@/lib/supabase/types";

export type BillingRunResult = {
  processed: number;
  created: Array<{ contractId: string; invoiceId: string; number: string }>;
  emailed: string[];
  emailFailed: Array<{ invoiceId: string; error: string }>;
  skipped: Array<{ contractId: string; reason: string }>;
  errors: Array<{ contractId: string; error: string }>;
};

type DbClient = SupabaseClient<Database>;

async function createInvoiceFromContract(
  supabase: DbClient,
  contract: Contract & {
    contract_lines: Array<{
      description: string;
      qty: number;
      unit_price: number;
      sort_order: number;
    }>;
  },
  settingsPaymentTerms: number,
): Promise<{ id: string; number: string } | { error: string }> {
  const billOn = contract.next_bill_on || todayIsoDate();

  if (contract.end_date && billOn > contract.end_date) {
    await supabase
      .from("contracts")
      .update({
        status: "ended",
        next_bill_on: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contract.id);
    return { error: "Contract end date reached" };
  }

  const lines = [...(contract.contract_lines ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  if (!lines.length) {
    return { error: "Contract has no line items" };
  }

  const { data: number, error: numError } = await supabase.rpc(
    "next_document_number",
    { p_type: "invoice" as DocumentType },
  );
  if (numError || !number) {
    return { error: numError?.message ?? "Could not allocate invoice number" };
  }

  const totals = totalsFromLines(lines);
  const terms =
    contract.payment_terms_days ?? settingsPaymentTerms ?? 14;
  const issueDate = todayIsoDate();
  const due = dueDateFromTerms(issueDate, terms);
  const token = newPublicToken();

  const { data: invoice, error: invError } = await supabase
    .from("documents")
    .insert({
      type: "invoice",
      number,
      status: "draft",
      client_id: contract.client_id,
      issue_date: issueDate,
      due_or_valid_until: due,
      notes: invoiceNotesForContract({
        title: contract.title,
        billOn,
        cadence: contract.cadence,
        existingNotes: contract.notes,
      }),
      subtotal: totals.subtotal,
      vat_total: 0,
      total: totals.total,
      contract_id: contract.id,
      public_token: token,
      billing_period_start: billOn,
    })
    .select("id, number")
    .single();

  if (invError || !invoice) {
    return { error: invError?.message ?? "Could not create invoice" };
  }

  const { error: linesError } = await supabase.from("document_lines").insert(
    lines.map((line, index) => ({
      document_id: invoice.id,
      description: line.description,
      qty: line.qty,
      unit_price: line.unit_price,
      vat_rate: 0,
      sort_order: line.sort_order ?? index,
      done_date: null,
    })),
  );
  if (linesError) {
    await supabase.from("documents").delete().eq("id", invoice.id);
    return { error: linesError.message };
  }

  let nextBill = addBillingPeriod(billOn, contract.cadence);
  let nextStatus: Contract["status"] = contract.status;
  if (contract.end_date && nextBill > contract.end_date) {
    nextBill = contract.end_date;
    // Keep next_bill_on at/after end so next run ends the contract
    if (billOn >= contract.end_date) {
      nextStatus = "ended";
    }
  }

  await supabase
    .from("contracts")
    .update({
      next_bill_on: nextStatus === "ended" ? null : nextBill,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contract.id);

  return { id: invoice.id, number: invoice.number };
}

export async function runContractBilling(
  supabase: DbClient,
  options?: { asOf?: string; contractId?: string },
): Promise<BillingRunResult> {
  const asOf = options?.asOf || todayIsoDate();
  const result: BillingRunResult = {
    processed: 0,
    created: [],
    emailed: [],
    emailFailed: [],
    skipped: [],
    errors: [],
  };

  const { data: settings } = await supabase
    .from("company_settings")
    .select("default_payment_terms_days")
    .limit(1)
    .maybeSingle();
  const terms = settings?.default_payment_terms_days ?? 14;

  let query = supabase
    .from("contracts")
    .select("*, contract_lines(*)")
    .eq("status", "active")
    .not("next_bill_on", "is", null)
    .lte("next_bill_on", asOf);

  if (options?.contractId) {
    query = query.eq("id", options.contractId);
  }

  const { data: contracts, error } = await query.order("next_bill_on");
  if (error) {
    result.errors.push({ contractId: "-", error: error.message });
    return result;
  }

  for (const contract of contracts ?? []) {
    result.processed += 1;

    const billOn = contract.next_bill_on!;
    const { data: existing } = await supabase
      .from("documents")
      .select("id, number")
      .eq("contract_id", contract.id)
      .eq("billing_period_start", billOn)
      .maybeSingle();

    if (existing) {
      result.skipped.push({
        contractId: contract.id,
        reason: `Invoice already exists for this period (${existing.number})`,
      });
      const nextBill = addBillingPeriod(billOn, contract.cadence);
      await supabase
        .from("contracts")
        .update({
          next_bill_on:
            contract.end_date && nextBill > contract.end_date
              ? null
              : nextBill,
          status:
            contract.end_date && nextBill > contract.end_date
              ? "ended"
              : contract.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);
      continue;
    }

    const created = await createInvoiceFromContract(supabase, contract, terms);
    if ("error" in created) {
      if (created.error === "Contract end date reached") {
        result.skipped.push({
          contractId: contract.id,
          reason: created.error,
        });
      } else {
        result.errors.push({ contractId: contract.id, error: created.error });
      }
      continue;
    }

    result.created.push({
      contractId: contract.id,
      invoiceId: created.id,
      number: created.number,
    });

    if (contract.auto_send) {
      const sendResult = await sendInvoiceEmailInternal(supabase, created.id);
      if (sendResult.ok) {
        result.emailed.push(created.id);
      } else {
        result.emailFailed.push({
          invoiceId: created.id,
          error: sendResult.error,
        });
      }
    }
  }

  return result;
}
