"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { calcDocumentTotals, todayIsoDate } from "@/lib/money";

const ALIKHANYE_BUSINESS = "Alikhanye Properties";

const NOTES = `Starter Website quotation for Alikhanye Properties (Blue Downs, Cape Town).

Limited-time Starter Website promotional price (normal list R2,999).

Scope delivered / included:
• Up to starter marketing pages — Home, About, Properties, Contact
• Professional responsive design (navy / gold brand)
• Company information, services overview, principal profile
• Property listings pages with agency-managed listings admin
• Contact / enquiry form, WhatsApp button, Google Maps
• Basic SEO (metadata, sitemap, robots)
• SSL via hosting platform; basic performance optimisation

Domain: alikhanye.com remains in the client’s name. DNS / go-live assistance included at no charge; future domain renewals billed at cost. Email hosting not included (admin@alikhanye.com remains with the client’s email provider).

Listings: VonWillingh Online / agency can add and update property listings via the protected admin. Client self-serve upload / full CMS login is not included and may be quoted separately as an add-on if required later.

Payment (website build): 50% deposit on acceptance, 50% prior to go-live (or as agreed if work is already underway / complete).

Optional monthly (not included in this quote total):
• Essential Care — from R299/mo (hosting support, SSL monitoring, backups where applicable, minor content help)
• SEO Growth / Advanced SEO — quoted separately if required

Prices exclusive of VAT unless otherwise stated. Final scope confirmed at kickoff / acceptance.

Important: the Total on this quote is the once-off website amount. Optional monthly services are billed separately and are not payable as one lump sum with the website deposit.`;

export type SeedAlikhanyeResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Create or reuse Alikhanye quote; returns document id (no redirect). */
export async function seedAlikhanyeQuote(): Promise<SeedAlikhanyeResult> {
  const { supabase } = await requireUser();

  let clientId: string;

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("business_name", ALIKHANYE_BUSINESS)
    .maybeSingle();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: created, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: "Wendy Landiswa Madikazi",
        business_name: ALIKHANYE_BUSINESS,
        email: "admin@alikhanye.com",
        phone: "073 752 9766",
        address: "16 Lilly Kate Crescent, Blue Downs, 7100",
        vat_number: "",
        notes:
          "Principal Property Practitioner (PPRE), FFC 1233579 | Reg. 2026/253356/07 | www.alikhanye.com | Slogan: Lighting the way to your dream home",
      })
      .select("id")
      .single();

    if (clientError || !created) {
      return {
        ok: false,
        error: clientError?.message ?? "Could not create Alikhanye client",
      };
    }
    clientId = created.id;
  }

  const { data: existingQuote } = await supabase
    .from("documents")
    .select("id")
    .eq("client_id", clientId)
    .eq("type", "quote")
    .neq("status", "void")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingQuote) {
    return { ok: true, id: existingQuote.id };
  }

  const lines = [
    {
      description:
        "Starter Website — limited-time promotional price (once-off) — Home, About, Properties, Contact; responsive design; enquiry form; WhatsApp; Google Maps; basic SEO; agency-managed property listings admin; SSL/hosting go-live assistance for alikhanye.com (normal list R2,999)",
      qty: 1,
      unit_price: 1999,
      vat_rate: 0,
      sort_order: 0,
      done_date: null as string | null,
    },
  ];

  const { data: number, error: numError } = await supabase.rpc(
    "next_document_number",
    { p_type: "quote" },
  );
  if (numError || !number) {
    return {
      ok: false,
      error: numError?.message ?? "Could not allocate quote number",
    };
  }

  const issueDate = todayIsoDate();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);
  const validUntilIso = validUntil.toISOString().slice(0, 10);

  const totals = calcDocumentTotals(
    lines.map((line) => ({
      qty: line.qty,
      unit_price: line.unit_price,
      vat_rate: 0,
    })),
  );

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      type: "quote",
      number,
      status: "draft",
      client_id: clientId,
      issue_date: issueDate,
      due_or_valid_until: validUntilIso,
      notes: NOTES,
      subtotal: totals.subtotal,
      vat_total: 0,
      total: totals.total,
    })
    .select("id")
    .single();

  if (docError || !doc) {
    return { ok: false, error: docError?.message ?? "Could not create quote" };
  }

  const { error: linesError } = await supabase.from("document_lines").insert(
    lines.map((line) => ({
      document_id: doc.id,
      description: line.description,
      qty: line.qty,
      unit_price: line.unit_price,
      vat_rate: 0,
      sort_order: line.sort_order,
      done_date: line.done_date,
    })),
  );

  if (linesError) {
    return {
      ok: false,
      error: `Quote created but lines failed: ${linesError.message}`,
    };
  }

  return { ok: true, id: doc.id };
}

export async function seedAlikhanyeQuoteAndOpen(): Promise<void> {
  const result = await seedAlikhanyeQuote();
  if (!result.ok) {
    redirect(
      `/documents/seed-alikhanye?error=${encodeURIComponent(result.error)}`,
    );
  }
  redirect(`/documents/${result.id}/print`);
}
