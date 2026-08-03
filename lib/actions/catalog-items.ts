"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const catalogItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit_price: z.coerce.number().min(0),
  active: z.boolean().optional().default(true),
});

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function parseActive(formData: FormData) {
  const raw = formData.get("active");
  return raw === "on" || raw === "true" || raw === "1";
}

export async function createCatalogItem(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = catalogItemSchema.safeParse({
    name: formData.get("name"),
    unit_price: formData.get("unit_price") || 0,
    active: parseActive(formData),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { supabase } = await requireUser();
  const { data: maxRow } = await supabase
    .from("catalog_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      name: parsed.data.name.trim(),
      unit_price: parsed.data.unit_price,
      active: parsed.data.active,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/items");
  revalidatePath("/documents");
  return { ok: true, id: data.id };
}

export async function updateCatalogItem(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = catalogItemSchema.safeParse({
    name: formData.get("name"),
    unit_price: formData.get("unit_price") || 0,
    active: parseActive(formData),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("catalog_items")
    .update({
      name: parsed.data.name.trim(),
      unit_price: parsed.data.unit_price,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/items");
  revalidatePath("/documents");
  return { ok: true, id };
}

export async function deleteCatalogItem(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/items");
  revalidatePath("/documents");
  return { ok: true, id };
}
