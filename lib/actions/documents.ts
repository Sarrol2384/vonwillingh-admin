"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dueDateFromTerms, newPublicToken } from "@/lib/billing";
import { calcDocumentTotals, todayIsoDate } from "@/lib/money";
import type { DocumentStatus, DocumentType } from "@/lib/supabase/types";

async function defaultInvoiceDueDate(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  issueDate: string,
  provided: string | null | undefined,
): Promise<string | null> {
  const trimmed = provided?.trim() || "";
  if (trimmed) return trimmed;

  const { data: settings } = await supabase
    .from("company_settings")
    .select("default_payment_terms_days")
    .limit(1)
    .maybeSingle();

  return dueDateFromTerms(
    issueDate,
    settings?.default_payment_terms_days ?? 14,
  );
}

const lineSchema = z.object({
  description: z.string().min(1),
  qty: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0),
  vat_rate: z.coerce.number().min(0).max(100),
  sort_order: z.coerce.number().int().min(0),
  done_date: z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return trimmed.length > 0 ? trimmed : null;
    }),
});

function lineInsert(
  documentId: string,
  line: z.infer<typeof lineSchema>,
  index: number,
) {
  return {
    document_id: documentId,
    description: line.description,
    qty: line.qty,
    unit_price: line.unit_price,
    vat_rate: 0,
    sort_order: line.sort_order ?? index,
    done_date: line.done_date,
  };
}

const documentSchema = z.object({
  type: z.enum(["quote", "invoice", "credit_note"]),
  client_id: z.string().uuid(),
  status: z.enum([
    "draft",
    "sent",
    "accepted",
    "declined",
    "paid",
    "issued",
    "void",
  ]),
  issue_date: z.string().min(1),
  due_or_valid_until: z.string().optional().nullable(),
  notes: z.string().optional().default(""),
  lines: z.array(lineSchema).min(1, "Add at least one line item"),
});

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function parseLines(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return z.array(lineSchema).safeParse(parsed);
  } catch {
    return { success: false as const, error: { issues: [{ message: "Invalid lines" }] } };
  }
}

export async function createDocument(formData: FormData): Promise<ActionResult> {
  const linesResult = parseLines(String(formData.get("lines") ?? "[]"));
  if (!linesResult.success) {
    return { ok: false, error: linesResult.error.issues[0]?.message ?? "Invalid lines" };
  }

  const parsed = documentSchema.safeParse({
    type: formData.get("type"),
    client_id: formData.get("client_id"),
    status: formData.get("status") || "draft",
    issue_date: formData.get("issue_date") || todayIsoDate(),
    due_or_valid_until: formData.get("due_or_valid_until") || null,
    notes: formData.get("notes") || "",
    lines: linesResult.data,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { supabase } = await requireUser();
  const { data: number, error: numError } = await supabase.rpc(
    "next_document_number",
    { p_type: parsed.data.type },
  );
  if (numError || !number) {
    return { ok: false, error: numError?.message ?? "Could not allocate document number" };
  }

  const dueOrValid =
    parsed.data.type === "invoice"
      ? await defaultInvoiceDueDate(
          supabase,
          parsed.data.issue_date,
          parsed.data.due_or_valid_until,
        )
      : parsed.data.due_or_valid_until || null;

  const totals = calcDocumentTotals(
    parsed.data.lines.map((line) => ({
      qty: line.qty,
      unit_price: line.unit_price,
      vat_rate: 0,
    })),
  );
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      type: parsed.data.type,
      number,
      status: parsed.data.status,
      client_id: parsed.data.client_id,
      issue_date: parsed.data.issue_date,
      due_or_valid_until: dueOrValid,
      notes: parsed.data.notes,
      subtotal: totals.subtotal,
      vat_total: 0,
      total: totals.total,
      public_token:
        parsed.data.type === "invoice" ? newPublicToken() : null,
    })
    .select("id")
    .single();

  if (error || !doc) return { ok: false, error: error?.message ?? "Create failed" };

  const { error: linesError } = await supabase.from("document_lines").insert(
    parsed.data.lines.map((line, index) => lineInsert(doc.id, line, index)),
  );
  if (linesError) return { ok: false, error: linesError.message };

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect(`/documents/${doc.id}`);
}

export async function updateDocument(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const linesResult = parseLines(String(formData.get("lines") ?? "[]"));
  if (!linesResult.success) {
    return { ok: false, error: linesResult.error.issues[0]?.message ?? "Invalid lines" };
  }

  const parsed = documentSchema.safeParse({
    type: formData.get("type"),
    client_id: formData.get("client_id"),
    status: formData.get("status") || "draft",
    issue_date: formData.get("issue_date") || todayIsoDate(),
    due_or_valid_until: formData.get("due_or_valid_until") || null,
    notes: formData.get("notes") || "",
    lines: linesResult.data,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { supabase } = await requireUser();
  const dueOrValid =
    parsed.data.type === "invoice"
      ? await defaultInvoiceDueDate(
          supabase,
          parsed.data.issue_date,
          parsed.data.due_or_valid_until,
        )
      : parsed.data.due_or_valid_until || null;
  const totals = calcDocumentTotals(
    parsed.data.lines.map((line) => ({
      qty: line.qty,
      unit_price: line.unit_price,
      vat_rate: 0,
    })),
  );

  const { error } = await supabase
    .from("documents")
    .update({
      status: parsed.data.status as DocumentStatus,
      client_id: parsed.data.client_id,
      issue_date: parsed.data.issue_date,
      due_or_valid_until: dueOrValid,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
      subtotal: totals.subtotal,
      vat_total: 0,
      total: totals.total,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("document_lines").delete().eq("document_id", id);
  const { error: linesError } = await supabase.from("document_lines").insert(
    parsed.data.lines.map((line, index) => lineInsert(id, line, index)),
  );
  if (linesError) return { ok: false, error: linesError.message };

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("documents")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function duplicateDocument(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data: source, error } = await supabase
    .from("documents")
    .select("*, document_lines(*)")
    .eq("id", id)
    .single();

  if (error || !source) {
    return { ok: false, error: error?.message ?? "Document not found" };
  }

  const { data: number, error: numError } = await supabase.rpc(
    "next_document_number",
    { p_type: source.type },
  );
  if (numError || !number) {
    return {
      ok: false,
      error: numError?.message ?? "Could not allocate document number",
    };
  }

  const lines = [...(source.document_lines ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const totals = calcDocumentTotals(
    lines.map((line) => ({
      qty: Number(line.qty),
      unit_price: Number(line.unit_price),
      vat_rate: 0,
    })),
  );

  const { data: copy, error: copyError } = await supabase
    .from("documents")
    .insert({
      type: source.type,
      number,
      status: "draft",
      client_id: source.client_id,
      issue_date: todayIsoDate(),
      due_or_valid_until:
        source.type === "invoice"
          ? await defaultInvoiceDueDate(supabase, todayIsoDate(), null)
          : source.due_or_valid_until,
      notes: source.notes,
      subtotal: totals.subtotal,
      vat_total: 0,
      total: totals.total,
      source_quote_id: null,
      public_token: source.type === "invoice" ? newPublicToken() : null,
    })
    .select("id")
    .single();

  if (copyError || !copy) {
    return { ok: false, error: copyError?.message ?? "Could not duplicate" };
  }

  if (lines.length) {
    const { error: linesError } = await supabase.from("document_lines").insert(
      lines.map((line, index) => ({
        document_id: copy.id,
        description: line.description,
        qty: line.qty,
        unit_price: line.unit_price,
        vat_rate: 0,
        sort_order: line.sort_order ?? index,
        done_date: line.done_date ?? null,
      })),
    );
    if (linesError) return { ok: false, error: linesError.message };
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect(`/documents/${copy.id}`);
}

export async function convertQuoteToInvoice(quoteId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data: quote, error } = await supabase
    .from("documents")
    .select("*, document_lines(*)")
    .eq("id", quoteId)
    .eq("type", "quote")
    .single();

  if (error || !quote) return { ok: false, error: error?.message ?? "Quote not found" };

  const { data: number, error: numError } = await supabase.rpc(
    "next_document_number",
    { p_type: "invoice" as DocumentType },
  );
  if (numError || !number) {
    return { ok: false, error: numError?.message ?? "Could not allocate invoice number" };
  }

  const issueDate = todayIsoDate();
  const due = await defaultInvoiceDueDate(supabase, issueDate, null);

  const lines = (quote.document_lines ?? []).sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const totals = calcDocumentTotals(
    lines.map((line) => ({
      qty: Number(line.qty),
      unit_price: Number(line.unit_price),
      vat_rate: 0,
    })),
  );

  const { data: invoice, error: invError } = await supabase
    .from("documents")
    .insert({
      type: "invoice",
      number,
      status: "draft",
      client_id: quote.client_id,
      issue_date: issueDate,
      due_or_valid_until: due,
      notes: quote.notes,
      subtotal: totals.subtotal,
      vat_total: 0,
      total: totals.total,
      source_quote_id: quote.id,
      public_token: newPublicToken(),
    })
    .select("id")
    .single();

  if (invError || !invoice) {
    return { ok: false, error: invError?.message ?? "Could not create invoice" };
  }

  if (lines.length) {
    const { error: linesError } = await supabase.from("document_lines").insert(
      lines.map((line, index) => ({
        document_id: invoice.id,
        description: line.description,
        qty: line.qty,
        unit_price: line.unit_price,
        vat_rate: 0,
        sort_order: line.sort_order ?? index,
        done_date: line.done_date ?? null,
      })),
    );
    if (linesError) return { ok: false, error: linesError.message };
  }

  await supabase
    .from("documents")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", quoteId);

  revalidatePath("/documents");
  revalidatePath(`/documents/${quoteId}`);
  revalidatePath("/dashboard");
  redirect(`/documents/${invoice.id}`);
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect("/documents");
}
