"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  business_name: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  vat_number: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createClient(formData: FormData): Promise<ActionResult> {
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    business_name: formData.get("business_name") || "",
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    address: formData.get("address") || "",
    vat_number: formData.get("vat_number") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("clients")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect(`/clients/${data.id}`);
}

export async function updateClient(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    business_name: formData.get("business_name") || "",
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    address: formData.get("address") || "",
    vat_number: formData.get("vat_number") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("clients")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23503"
          ? "Cannot delete a client that has documents."
          : error.message,
    };
  }
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect("/clients");
}
