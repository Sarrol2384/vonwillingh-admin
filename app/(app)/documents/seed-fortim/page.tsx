import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { calcDocumentTotals, todayIsoDate } from "@/lib/money";

const FORTIM_BUSINESS = "Fortim Pest Management";

const NOTES = `Business Website quotation for www.fortimpest.co.za (Strand, Western Cape).

Recommended Option A:
• Business Website — up to 7 pages (once-off)
• Business Care — hosting, SSL, backups, security, up to 30 min minor content changes/month
• Advanced SEO & AI Visibility — ongoing search + AI visibility work

Includes: customised branding, service pages, gallery, testimonials, enquiry forms, WhatsApp, Google Maps, Analytics & Search Console setup, basic keyword SEO, image optimisation, lead capture, blog/news capability.

Domain: fortimpest.co.za remains in Fortim’s name. Transfer/DNS assistance included at no charge; future .co.za renewals billed at cost. Email hosting not included.

Payment (website build): 50% deposit on acceptance, 50% prior to go-live.
Monthly services: billed in advance; cancellable with 30 days’ written notice. No 12-month lock-in unless agreed in writing.

Prices are starting (“from”) amounts ex VAT where marked. Final scope confirmed at kickoff.

Important: the Total on this quote adds the listed unit prices for reference only. The website is once-off; Care and SEO are billed monthly and are not payable as one lump sum with the website deposit (deposit = 50% of the once-off website amount).

Lean alternative: Essential Care (R299/mo) + SEO Growth (from R1,499/mo).
Website-only option: Business Website once-off without monthly services.`;

/**
 * Creates (or reuses) Fortim Pest Management client + recommended-bundle quote,
 * then redirects to the letterhead print view.
 */
export default async function SeedFortimQuotePage() {
  const { supabase } = await requireUser();

  let clientId: string;

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("business_name", FORTIM_BUSINESS)
    .maybeSingle();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: created, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: "Tony",
        business_name: FORTIM_BUSINESS,
        email: "tony.fortimpest@outlook.com",
        phone: "083 700 9670",
        address: "Strand, Western Cape",
        vat_number: "",
        notes:
          "www.fortimpest.co.za | Hunter: 082 428 9675 / hunter.fortimpest@outlook.com",
      })
      .select("id")
      .single();

    if (clientError || !created) {
      return (
        <p className="p-6 text-sm text-red-600">
          Could not create Fortim client: {clientError?.message ?? "unknown error"}
        </p>
      );
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
    redirect(`/documents/${existingQuote.id}/print`);
  }

  const lines = [
    {
      description:
        "Business Website (once-off) — up to 7 pages, customised branding, enquiry forms, WhatsApp, Maps, Analytics/Search Console, basic SEO foundations, lead capture, blog/news capability",
      qty: 1,
      unit_price: 4999,
      vat_rate: 0,
      sort_order: 0,
      done_date: null as string | null,
    },
    {
      description:
        "Business Care (monthly) — hosting, SSL, backups, security updates, uptime monitoring, up to 30 minutes minor content changes/month, priority support",
      qty: 1,
      unit_price: 599,
      vat_rate: 0,
      sort_order: 1,
      done_date: null,
    },
    {
      description:
        "Advanced SEO & AI Visibility (monthly, from) — advanced SEO, AI-search-friendly content, structured data, visibility monitoring, monthly reporting (does not guarantee rankings)",
      qty: 1,
      unit_price: 2999,
      vat_rate: 0,
      sort_order: 2,
      done_date: null,
    },
  ];

  const { data: number, error: numError } = await supabase.rpc(
    "next_document_number",
    { p_type: "quote" },
  );
  if (numError || !number) {
    return (
      <p className="p-6 text-sm text-red-600">
        Could not allocate quote number: {numError?.message ?? "unknown error"}
      </p>
    );
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
    return (
      <p className="p-6 text-sm text-red-600">
        Could not create quote: {docError?.message ?? "unknown error"}
      </p>
    );
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
    return (
      <p className="p-6 text-sm text-red-600">
        Quote created but lines failed: {linesError.message}. Open{" "}
        <a className="underline" href={`/documents/${doc.id}`}>
          the quote
        </a>{" "}
        to fix.
      </p>
    );
  }

  redirect(`/documents/${doc.id}/print`);
}
