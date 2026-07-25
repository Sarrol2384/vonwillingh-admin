import { Document, Footer, Header, PageNumber, Paragraph, TextRun, AlignmentType } from "docx";
import type { Client, CompanySettings } from "@/lib/supabase/types";
import type { DiscoveryBriefContent } from "@/lib/client-documents";
import {
  FONT,
  MUTED,
  body,
  centeredHeading,
  centeredSubtitle,
  centeredTitle,
  check,
  fillBlock,
  fillLine,
  footerLine,
  sectionTitle,
  subTitle,
  tip,
} from "./styles";

export function buildDiscoveryBriefDocx({
  client,
  company,
  content,
}: {
  client: Client;
  company: CompanySettings;
  content: DiscoveryBriefContent;
}): Document {
  const tradingName = client.business_name?.trim() || client.name;

  const children = [
    centeredTitle(company.company_name.toUpperCase()),
    centeredSubtitle("Custom web applications & websites for South African businesses"),
    centeredHeading("WEBSITE / WEB APP DISCOVERY MEETING BRIEF"),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 160 },
      children: [
        new TextRun({
          text: `${company.email}  ·  ${company.phone}  ·  ${company.website}`,
          size: 16,
          font: FONT,
          color: MUTED,
        }),
      ],
    }),
    body(
      "Use this brief in the discovery meeting. Tick what applies, fill blanks, and capture enough detail to prepare an accurate quotation afterward.",
    ),
    sectionTitle("1. Meeting details"),
    fillLine("Meeting date:", content.meeting_date || undefined),
    fillLine("Prepared by:", content.prepared_by || company.contact_name),
    fillLine("Client attendees:", content.client_attendees || client.name),
    fillLine("VonWillingh attendees:", content.vonwillingh_attendees || undefined),
    fillLine("Project working title:", content.project_title || tradingName),
    fillLine("How they found us:", content.how_found || undefined),
    sectionTitle("2. Client & business"),
    fillLine("Legal / trading name:", tradingName),
    fillLine("Industry / niche:", content.industry || undefined),
    fillLine("Primary contact:", client.name),
    fillLine("Role / title:", content.contact_role || undefined),
    fillLine("Phone / WhatsApp:", client.phone || undefined),
    fillLine("Email:", client.email || undefined),
    fillLine("Business address / service area:", client.address || undefined),
    fillLine("Existing website (if any):", content.existing_website || undefined),
    fillLine("Social media:", content.social_media || undefined),
    fillLine("Competitors or sites they admire:", content.competitors || undefined),
    ...fillBlock("What does the business do? (1-2 sentences)", content.business_summary || client.notes, 2),
    tip("Ask who their ideal customer is and what a 'good month' looks like — it shapes homepage messaging and CTAs."),
    sectionTitle("3. Project type (scope path)"),
    body(
      "VonWillingh builds starter / brochure websites and full custom web applications (see vonwillingh.co.za). Confirm which path fits — or a phased plan (site first, app later).",
    ),
    check("Starter / brochure website (info site, branding, contact & lead capture)"),
    check("Business website with extras (gallery, blog, bookings, basic shop, etc.)"),
    check("Custom web application (logins, dashboards, workflows, databases, integrations)"),
    check("Phased: launch a website now, plan a custom app later"),
    check("Unsure — need recommendation after discovery"),
    ...fillBlock("If custom web app: what problem should the system solve?", content.custom_app_problem, 2),
    check("Staff / admin portal"),
    check("Client / customer portal"),
    check("Bookings / appointments / jobs"),
    check("Quotes, invoices, or CRM-style tools"),
    check("Inventory / stock / orders"),
    check("Payments / subscriptions"),
    check("Integrations (WhatsApp, PayFast/Ozow, Xero/Sage, Google, other)"),
    fillLine("Other systems they use today:", content.other_systems || undefined),
    tip("Custom apps are for when they outgrow a brochure site — e.g. staff logins, automated workflows, or a live cloud system."),
    sectionTitle("4. Goals & success"),
    check("Generate leads / enquiries"),
    check("Take bookings or sell online"),
    check("Look credible / professional"),
    check("Replace manual admin / paperwork"),
    check("Inform customers (hours, services, prices, location)"),
    fillLine("Primary goal:", content.primary_goal || undefined),
    fillLine("Target audience:", content.target_audience || undefined),
    fillLine("Success in 3-6 months looks like:", content.success_metric || undefined),
    ...fillBlock("Why do they want this now?", content.why_now, 2),
    sectionTitle("5. Brand & design"),
    check("Logo ready (vector/PNG preferred)"),
    check("Logo needs redesign / new logo"),
    check("No logo yet — include in quote"),
    fillLine("Brand colours:", content.brand_colours || undefined),
    fillLine("Fonts / style words:", content.style_words || undefined),
    fillLine("Reference sites they LIKE:", content.sites_like || undefined),
    fillLine("Reference sites they DISLIKE:", content.sites_dislike || undefined),
    sectionTitle("6. Sitemap & pages"),
    check("Home"), check("About"), check("Services / Products"), check("Gallery / Portfolio"),
    check("Pricing"), check("Testimonials"), check("Blog / News"), check("FAQ"),
    check("Contact"), check("Booking page"), check("Shop / Catalogue"),
    fillLine("Estimated page count:", content.page_count || undefined),
    ...fillBlock("Homepage message / offer", content.homepage_message, 2),
    sectionTitle("7. Features & functionality"),
    subTitle("Usually included / recommended"),
    check("Mobile-friendly design"), check("Contact form (POPIA consent)"),
    check("Click-to-WhatsApp / click-to-call"), check("Google Maps / directions"),
    check("Basic SEO"), check("Google Analytics"), check("SSL / HTTPS hosting"),
    subTitle("Optional add-ons"),
    check("Online bookings"), check("E-commerce / payments"), check("Blog / CMS"),
    check("Multi-language"), check("Newsletter signup"), check("Member / client login"),
    sectionTitle("8. Content, domain & hosting"),
    fillLine("Domain name (have / want):", content.domain || undefined),
    check("Business email needed (@theirbrand)"),
    sectionTitle("9. Timeline, budget & decision"),
    fillLine("Ideal go-live date:", content.go_live_date || undefined),
    fillLine("Hard deadline / event:", content.deadline || undefined),
    fillLine("Decision-maker(s):", content.decision_makers || client.name),
    check("Budget discussed (optional): under R5k / R5-15k / R15-40k / R40k+ / TBD"),
    sectionTitle("10. Notes for quotation"),
    ...fillBlock("Meeting notes", content.meeting_notes, 4),
    ...fillBlock("Agreed next steps", content.next_steps, 2),
    footerLine(
      `${company.company_name}  ·  ${company.email}  ·  ${company.phone}  ·  ${company.address}`,
    ),
    new Paragraph({
      spacing: { before: 40 },
      children: [
        new TextRun({
          text: "Confidential — for project discovery and quotation purposes only.",
          size: 14,
          font: FONT,
          color: MUTED,
          italics: true,
        }),
      ],
    }),
  ];

  return new Document({
    creator: company.company_name,
    title: `Discovery Brief - ${tradingName}`,
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${company.company_name} · Discovery Brief`,
                    size: 14,
                    font: FONT,
                    color: MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${company.email}  ·  Page `,
                    size: 14,
                    font: FONT,
                    color: MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 14,
                    font: FONT,
                    color: MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}
