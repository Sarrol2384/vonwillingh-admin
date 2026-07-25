import { Document, Footer, Header, PageNumber, Paragraph, TextRun, AlignmentType } from "docx";
import type { Client, CompanySettings } from "@/lib/supabase/types";
import type { AgreementContent } from "@/lib/client-documents";
import {
  ACCENT,
  FONT,
  MUTED,
  body,
  centeredHeading,
  centeredSubtitle,
  centeredTitle,
  fillBlock,
  fillLine,
  footerLine,
  sectionTitle,
} from "./styles";

export function buildAgreementDocx({
  title,
  client,
  company,
  content,
}: {
  title: string;
  client: Client;
  company: CompanySettings;
  content: AgreementContent;
}): Document {
  const clientLabel = client.business_name?.trim() || client.name;
  const children = [
    centeredTitle(company.company_name.toUpperCase()),
    centeredSubtitle("Custom web applications & websites for South African businesses"),
    centeredHeading("SERVICE AGREEMENT"),
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
    body(`Agreement: ${title}`),
    body(`Date: ${content.agreement_date || new Date().toISOString().slice(0, 10)}`),
    sectionTitle("1. Parties"),
    fillLine("Service provider:", company.company_name),
    fillLine("Client:", clientLabel),
    fillLine("Contact:", client.name),
    fillLine("Email:", client.email || undefined),
    fillLine("Phone:", client.phone || undefined),
    fillLine("Address:", client.address || undefined),
    sectionTitle("2. Project"),
    fillLine("Project title:", content.project_title || title),
    ...fillBlock("Project description", content.project_description, 2),
    sectionTitle("3. Scope of work"),
    ...fillBlock("Scope", content.scope, 4),
    sectionTitle("4. Deliverables"),
    ...fillBlock("Deliverables", content.deliverables, 3),
    sectionTitle("5. Timeline"),
    fillLine("Go-live / delivery date:", content.go_live_date || undefined),
    ...fillBlock("Timeline notes", content.timeline_notes, 2),
    sectionTitle("6. Payment terms"),
    fillLine("Total project fee:", content.total_fee || undefined),
    fillLine("Deposit:", content.deposit || undefined),
    fillLine("Balance due:", content.balance || undefined),
    fillLine("Payment terms (days):", content.payment_terms_days || undefined),
    ...fillBlock("Payment schedule / notes", content.payment_notes, 2),
    sectionTitle("7. Exclusions"),
    ...fillBlock("Out of scope / exclusions", content.exclusions, 2),
    sectionTitle("8. General terms"),
    body(
      "The client agrees to provide content, feedback, and access required for delivery within agreed timeframes. VonWillingh Online retains ownership of underlying code and frameworks; the client receives a licence to use the delivered solution for their business upon full payment.",
    ),
    body(
      "Either party may terminate with written notice if the other materially breaches this agreement and fails to remedy within 14 days. Work completed to date remains payable.",
    ),
    sectionTitle("9. Acceptance"),
    fillLine("Client name:", content.acceptance_name || client.name),
    fillLine("Signature:", undefined),
    fillLine("Date:", content.acceptance_date || undefined),
    fillLine("VonWillingh representative:", company.contact_name),
    footerLine(
      `${company.company_name}  ·  ${company.email}  ·  ${company.phone}  ·  ${company.address}`,
    ),
    new Paragraph({
      spacing: { before: 40 },
      children: [
        new TextRun({
          text: "Confidential — for project agreement purposes only.",
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
    title: `Service Agreement - ${clientLabel}`,
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
                    text: `${company.company_name} · Service Agreement`,
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
