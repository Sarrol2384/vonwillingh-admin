"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { defaultNextBillOn } from "@/lib/billing";
import { runContractBilling } from "@/lib/billing-run";
import { todayIsoDate } from "@/lib/money";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const lineSchema = z.object({
  description: z.string().min(1),
  qty: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0),
  sort_order: z.coerce.number().int().min(0),
});

const contractSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  status: z.enum(["draft", "active", "paused", "ended"]),
  cadence: z.enum(["monthly", "quarterly", "yearly"]),
  start_date: z.string().min(1),
  end_date: z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return trimmed.length > 0 ? trimmed : null;
    }),
  next_bill_on: z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return trimmed.length > 0 ? trimmed : null;
    }),
  auto_send: z.boolean(),
  payment_terms_days: z
    .union([z.coerce.number().int().min(0).max(365), z.nan()])
    .optional()
    .nullable()
    .transform((value) =>
      value == null || Number.isNaN(value) ? null : value,
    ),
  notes: z.string().optional().default(""),
  lines: z.array(lineSchema).min(1, "Add at least one line item"),
});

function parseLines(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return z.array(lineSchema).safeParse(parsed);
  } catch {
    return {
      success: false as const,
      error: { issues: [{ message: "Invalid lines" }] },
    };
  }
}

function parseContractForm(formData: FormData) {
  const linesResult = parseLines(String(formData.get("lines") ?? "[]"));
  if (!linesResult.success) {
    return {
      success: false as const,
      error: linesResult.error.issues[0]?.message ?? "Invalid lines",
    };
  }

  const paymentTermsRaw = String(formData.get("payment_terms_days") ?? "").trim();
  const parsed = contractSchema.safeParse({
    client_id: formData.get("client_id"),
    title: formData.get("title"),
    status: formData.get("status") || "draft",
    cadence: formData.get("cadence") || "monthly",
    start_date: formData.get("start_date") || todayIsoDate(),
    end_date: formData.get("end_date") || null,
    next_bill_on: formData.get("next_bill_on") || null,
    auto_send: formData.get("auto_send") === "on" || formData.get("auto_send") === "true",
    payment_terms_days: paymentTermsRaw === "" ? null : paymentTermsRaw,
    notes: formData.get("notes") || "",
    lines: linesResult.data,
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid contract data",
    };
  }

  return { success: true as const, data: parsed.data };
}

export async function createContract(formData: FormData): Promise<ActionResult> {
  const parsed = parseContractForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error };

  const { supabase } = await requireUser();
  const nextBill =
    parsed.data.status === "active"
      ? parsed.data.next_bill_on || defaultNextBillOn(parsed.data.start_date)
      : parsed.data.next_bill_on;

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      client_id: parsed.data.client_id,
      title: parsed.data.title.trim(),
      status: parsed.data.status,
      cadence: parsed.data.cadence,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      next_bill_on: nextBill,
      auto_send: parsed.data.auto_send,
      payment_terms_days: parsed.data.payment_terms_days,
      notes: parsed.data.notes.trim(),
    })
    .select("id")
    .single();

  if (error || !contract) {
    return { ok: false, error: error?.message ?? "Could not create contract" };
  }

  const { error: linesError } = await supabase.from("contract_lines").insert(
    parsed.data.lines.map((line, index) => ({
      contract_id: contract.id,
      description: line.description,
      qty: line.qty,
      unit_price: line.unit_price,
      sort_order: line.sort_order ?? index,
    })),
  );
  if (linesError) return { ok: false, error: linesError.message };

  revalidatePath("/contracts");
  revalidatePath(`/clients/${parsed.data.client_id}`);
  redirect(`/contracts/${contract.id}`);
}

export async function updateContract(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseContractForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error };

  const { supabase } = await requireUser();
  const nextBill =
    parsed.data.status === "active"
      ? parsed.data.next_bill_on || defaultNextBillOn(parsed.data.start_date)
      : parsed.data.next_bill_on;

  const { error } = await supabase
    .from("contracts")
    .update({
      client_id: parsed.data.client_id,
      title: parsed.data.title.trim(),
      status: parsed.data.status,
      cadence: parsed.data.cadence,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      next_bill_on: nextBill,
      auto_send: parsed.data.auto_send,
      payment_terms_days: parsed.data.payment_terms_days,
      notes: parsed.data.notes.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("contract_lines").delete().eq("contract_id", id);
  const { error: linesError } = await supabase.from("contract_lines").insert(
    parsed.data.lines.map((line, index) => ({
      contract_id: id,
      description: line.description,
      qty: line.qty,
      unit_price: line.unit_price,
      sort_order: line.sort_order ?? index,
    })),
  );
  if (linesError) return { ok: false, error: linesError.message };

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${id}`);
  revalidatePath(`/clients/${parsed.data.client_id}`);
  return { ok: true, id };
}

export async function deleteContract(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id")
    .eq("id", id)
    .maybeSingle();

  if (!contract) return { ok: false, error: "Contract not found" };

  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/contracts");
  revalidatePath(`/clients/${contract.client_id}`);
  redirect("/contracts");
}

export async function runBillingNow(formData?: FormData): Promise<
  | { ok: true; summary: string }
  | { ok: false; error: string }
> {
  const { supabase } = await requireUser();
  const contractId = String(formData?.get("contract_id") || "").trim() || undefined;

  const result = await runContractBilling(supabase, { contractId });

  revalidatePath("/contracts");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/payments");

  const summary = [
    `Processed ${result.processed} contract(s)`,
    `created ${result.created.length} invoice(s)`,
    `emailed ${result.emailed.length}`,
    result.emailFailed.length ? `${result.emailFailed.length} email failure(s)` : null,
    result.errors.length ? `${result.errors.length} error(s)` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (result.errors.length && !result.created.length) {
    return {
      ok: false,
      error: result.errors[0]?.error ?? summary,
    };
  }

  return { ok: true, summary };
}
