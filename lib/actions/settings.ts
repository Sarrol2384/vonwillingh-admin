"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const settingsSchema = z.object({
  company_name: z.string().min(1),
  contact_name: z.string().min(1),
  email: z.string().email().or(z.literal("")),
  phone: z.string(),
  address: z.string(),
  website: z.string(),
  vat_number: z.string(),
  registration_number: z.string(),
  bank_name: z.string(),
  bank_account_name: z.string(),
  bank_account_number: z.string(),
  bank_branch_code: z.string(),
  default_payment_terms_days: z.coerce.number().int().min(0).max(365),
  default_quote_validity_days: z.coerce.number().int().min(0).max(365),
  invoice_prefix: z.string().min(1).max(10),
  quote_prefix: z.string().min(1).max(10),
  credit_note_prefix: z.string().min(1).max(10),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateCompanySettings(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse({
    company_name: formData.get("company_name"),
    contact_name: formData.get("contact_name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    address: formData.get("address") || "",
    website: formData.get("website") || "",
    vat_number: formData.get("vat_number") || "",
    registration_number: formData.get("registration_number") || "",
    bank_name: formData.get("bank_name") || "",
    bank_account_name: formData.get("bank_account_name") || "",
    bank_account_number: formData.get("bank_account_number") || "",
    bank_branch_code: formData.get("bank_branch_code") || "",
    default_payment_terms_days: formData.get("default_payment_terms_days") || 14,
    default_quote_validity_days:
      formData.get("default_quote_validity_days") || 30,
    invoice_prefix: formData.get("invoice_prefix") || "INV",
    quote_prefix: formData.get("quote_prefix") || "QUO",
    credit_note_prefix: formData.get("credit_note_prefix") || "CN",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { supabase } = await requireUser();
  const { data: existing } = await supabase
    .from("company_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("company_settings").insert({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("company_settings")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/documents");
  return { ok: true };
}
