"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { WEBSITE_CATALOG_SEED } from "@/lib/catalog-seed";

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

export type SeedCatalogResult =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: string };

/** Idempotent import of website packages/care/cloud/add-ons by name. */
export async function seedCatalogFromWebsite(): Promise<SeedCatalogResult> {
  const { supabase } = await requireUser();

  const { data: existing, error: listError } = await supabase
    .from("catalog_items")
    .select("name, sort_order");

  if (listError) return { ok: false, error: listError.message };

  const existingNames = new Set(
    (existing ?? []).map((row) => row.name.trim().toLowerCase()),
  );
  let nextSort =
    (existing ?? []).reduce(
      (max, row) => Math.max(max, row.sort_order ?? 0),
      0,
    ) + 1;

  let added = 0;
  let skipped = 0;

  for (const seed of WEBSITE_CATALOG_SEED) {
    const key = seed.name.trim().toLowerCase();
    if (existingNames.has(key)) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from("catalog_items").insert({
      name: seed.name,
      unit_price: seed.unit_price,
      active: true,
      sort_order: nextSort,
    });

    if (error) return { ok: false, error: error.message };

    existingNames.add(key);
    nextSort += 1;
    added += 1;
  }

  revalidatePath("/items");
  revalidatePath("/documents");
  return { ok: true, added, skipped };
}
