"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  defaultAgreementContent,
  defaultDiscoveryBriefContent,
  clientDocumentTypeFromParam,
} from "@/lib/client-documents";
import { COMPANY_DEFAULTS } from "@/lib/company";
import type { ActionResult } from "@/lib/actions/documents";
import type { Json } from "@/lib/supabase/types";

const contentSchema = z.record(z.string(), z.unknown()).optional().default({});

const clientDocumentSchema = z.object({
  client_id: z.string().uuid(),
  type: z.enum(["service_agreement", "discovery_brief"]),
  title: z.string().min(1, "Title is required"),
  status: z.string().optional().default("draft"),
  content: contentSchema,
});

function parseContent(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return contentSchema.safeParse(parsed);
  } catch {
    return { success: false as const, error: { issues: [{ message: "Invalid content" }] } };
  }
}

export async function createClientDocument(
  formData: FormData,
): Promise<ActionResult> {
  const contentResult = parseContent(String(formData.get("content") ?? "{}"));
  if (!contentResult.success) {
    return {
      ok: false,
      error: contentResult.error.issues[0]?.message ?? "Invalid content",
    };
  }

  const parsed = clientDocumentSchema.safeParse({
    client_id: formData.get("client_id"),
    type: formData.get("type"),
    title: formData.get("title"),
    status: formData.get("status") || "draft",
    content: contentResult.data,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("client_documents")
    .insert({
      client_id: parsed.data.client_id,
      type: parsed.data.type,
      title: parsed.data.title,
      status: parsed.data.status,
      content: parsed.data.content as Json,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${parsed.data.client_id}`);
  revalidatePath("/client-documents");
  redirect(`/client-documents/${data.id}`);
}

export async function updateClientDocument(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const contentResult = parseContent(String(formData.get("content") ?? "{}"));
  if (!contentResult.success) {
    return {
      ok: false,
      error: contentResult.error.issues[0]?.message ?? "Invalid content",
    };
  }

  const parsed = clientDocumentSchema.safeParse({
    client_id: formData.get("client_id"),
    type: formData.get("type"),
    title: formData.get("title"),
    status: formData.get("status") || "draft",
    content: contentResult.data,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("client_documents")
    .update({
      title: parsed.data.title,
      status: parsed.data.status,
      content: parsed.data.content as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${parsed.data.client_id}`);
  revalidatePath("/client-documents");
  revalidatePath(`/client-documents/${id}`);
  return { ok: true, id };
}

export async function deleteClientDocument(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data: existing } = await supabase
    .from("client_documents")
    .select("client_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("client_documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  if (existing?.client_id) revalidatePath(`/clients/${existing.client_id}`);
  revalidatePath("/client-documents");
  redirect("/clients");
}

export async function createDefaultClientDocument(
  clientId: string,
  typeParam: string,
): Promise<ActionResult> {
  const type = clientDocumentTypeFromParam(typeParam);
  if (!type) return { ok: false, error: "Invalid document type" };

  const { supabase } = await requireUser();
  const [{ data: client }, { data: settings }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("company_settings").select("*").limit(1).maybeSingle(),
  ]);

  if (!client) return { ok: false, error: "Client not found" };

  const companyContact =
    settings?.contact_name ?? COMPANY_DEFAULTS.contact_name;
  const tradingName = client.business_name?.trim() || client.name;
  const title =
    type === "service_agreement"
      ? `Service Agreement - ${tradingName}`
      : `Discovery Brief - ${tradingName}`;

  const content =
    type === "service_agreement"
      ? defaultAgreementContent(client.name, tradingName)
      : defaultDiscoveryBriefContent(client, companyContact);

  const { data, error } = await supabase
    .from("client_documents")
    .insert({
      client_id: clientId,
      type,
      title,
      status: "draft",
      content: content as Json,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${clientId}`);
  redirect(`/client-documents/${data.id}`);
}
