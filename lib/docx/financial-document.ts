import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Footer,
  Header,
  PageNumber,
} from "docx";
import { hasBankDetails } from "@/lib/company";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import {
  calcDocumentTotals,
  calcLineTotals,
  formatDate,
  formatZar,
} from "@/lib/money";
import type {
  Client,
  CompanySettings,
  Document as FinancialDocument,
  DocumentLine,
} from "@/lib/supabase/types";
import { ACCENT, FONT, MUTED } from "./styles";

function companyBlock(company: CompanySettings): Paragraph[] {
  const lines = [
    company.company_name,
    company.contact_name,
    company.address,
    company.email,
    company.phone,
    company.website || null,
    company.registration_number ? `Reg: ${company.registration_number}` : null,
  ].filter(Boolean) as string[];

  return lines.map(
    (line, i) =>
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: line,
            size: 18,
            font: FONT,
            bold: i === 0,
            color: i === 0 ? "222222" : MUTED,
          }),
        ],
      }),
  );
}

function clientBlock(client: Client): Paragraph[] {
  const displayName = client.business_name?.trim() || client.name;
  const paras: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "BILL TO",
          size: 16,
          font: FONT,
          bold: true,
          color: MUTED,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({ text: displayName, size: 20, font: FONT, bold: true }),
      ],
    }),
  ];

  if (client.business_name?.trim() && client.name) {
    paras.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: `Attn: ${client.name}`,
            size: 18,
            font: FONT,
            color: MUTED,
          }),
        ],
      }),
    );
  }
  if (client.address) {
    paras.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: client.address,
            size: 18,
            font: FONT,
            color: MUTED,
          }),
        ],
      }),
    );
  }
  if (client.email) {
    paras.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: client.email,
            size: 18,
            font: FONT,
            color: MUTED,
          }),
        ],
      }),
    );
  }
  if (client.phone) {
    paras.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: client.phone,
            size: 18,
            font: FONT,
            color: MUTED,
          }),
        ],
      }),
    );
  }
  return paras;
}

function lineTable(
  lines: DocumentLine[],
  totals: ReturnType<typeof calcDocumentTotals>,
): Table {
  const sorted = [...lines].sort((a, b) => a.sort_order - b.sort_order);
  const headerCell = (text: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) =>
    new TableCell({
      children: [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({
              text,
              bold: true,
              size: 18,
              font: FONT,
              color: ACCENT,
            }),
          ],
        }),
      ],
    });

  const rows = [
    new TableRow({
      children: [
        headerCell("Description"),
        headerCell("Qty", AlignmentType.RIGHT),
        headerCell("Unit", AlignmentType.RIGHT),
        headerCell("Amount", AlignmentType.RIGHT),
      ],
    }),
    ...sorted.map((line) => {
      const t = calcLineTotals({
        qty: Number(line.qty),
        unit_price: Number(line.unit_price),
        vat_rate: 0,
      });
      const cell = (text: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) =>
        new TableCell({
          children: [
            new Paragraph({
              alignment: align,
              children: [
                new TextRun({ text, size: 18, font: FONT }),
              ],
            }),
          ],
        });
      return new TableRow({
        children: [
          cell(line.description),
          cell(String(line.qty), AlignmentType.RIGHT),
          cell(formatZar(Number(line.unit_price)), AlignmentType.RIGHT),
          cell(formatZar(t.line_excl), AlignmentType.RIGHT),
        ],
      });
    }),
    new TableRow({
      children: [
        new TableCell({ columnSpan: 3, children: [new Paragraph({ children: [] })] }),
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `Total: ${formatZar(totals.total)}`,
                  bold: true,
                  size: 22,
                  font: FONT,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows,
  });
}

function bankSection(company: CompanySettings): Paragraph[] {
  if (!hasBankDetails(company)) {
    return [
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: "BANKING DETAILS",
            size: 16,
            font: FONT,
            bold: true,
            color: MUTED,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Bank details not configured — add them under Settings.",
            size: 18,
            font: FONT,
            italics: true,
            color: MUTED,
          }),
        ],
      }),
    ];
  }

  const items = [
    company.bank_name ? `Bank: ${company.bank_name}` : null,
    company.bank_account_name
      ? `Account name: ${company.bank_account_name}`
      : null,
    company.bank_account_number
      ? `Account number: ${company.bank_account_number}`
      : null,
    company.bank_branch_code
      ? `Branch code: ${company.bank_branch_code}`
      : null,
  ].filter(Boolean) as string[];

  return [
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: "BANKING DETAILS",
          size: 16,
          font: FONT,
          bold: true,
          color: MUTED,
        }),
      ],
    }),
    ...items.map(
      (item) =>
        new Paragraph({
          spacing: { after: 20 },
          children: [
            new TextRun({ text: item, size: 18, font: FONT }),
          ],
        }),
    ),
  ];
}

export function buildFinancialDocumentDocx({
  document,
  client,
  lines,
  company,
}: {
  document: FinancialDocument;
  client: Client;
  lines: DocumentLine[];
  company: CompanySettings;
}): Document {
  const title = DOCUMENT_TYPE_LABELS[document.type];
  const showValidity =
    document.type === "quote" && Boolean(document.due_or_valid_until);
  const totals = calcDocumentTotals(
    lines.map((line) => ({
      qty: Number(line.qty),
      unit_price: Number(line.unit_price),
      vat_rate: 0,
    })),
  );

  const metaLines = [
    `Issue date: ${formatDate(document.issue_date)}`,
    showValidity
      ? `Valid until: ${formatDate(document.due_or_valid_until)}`
      : null,
  ].filter(Boolean) as string[];

  const children = [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [5400, 3960],
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: companyBlock(company),
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: title.toUpperCase(),
                      bold: true,
                      size: 32,
                      font: FONT,
                      color: ACCENT,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 80 },
                  children: [
                    new TextRun({
                      text: document.number,
                      bold: true,
                      size: 24,
                      font: FONT,
                    }),
                  ],
                }),
                ...metaLines.map(
                  (line) =>
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { before: 40 },
                      children: [
                        new TextRun({
                          text: line,
                          size: 18,
                          font: FONT,
                          color: MUTED,
                        }),
                      ],
                    }),
                ),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 200 }, children: [] }),
    ...clientBlock(client),
    new Paragraph({ spacing: { before: 200 }, children: [] }),
    lineTable(lines, totals),
  ];

  if (document.notes) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: "NOTES",
            size: 16,
            font: FONT,
            bold: true,
            color: MUTED,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: document.notes,
            size: 18,
            font: FONT,
          }),
        ],
      }),
    );
  }

  if (document.type === "invoice" || document.type === "credit_note") {
    children.push(...bankSection(company));
  }

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 8 },
      },
      children: [
        new TextRun({
          text: "Thank you for your business.",
          size: 16,
          font: FONT,
          color: MUTED,
        }),
      ],
    }),
  );

  return new Document({
    creator: company.company_name,
    title: `${title} ${document.number}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${company.company_name} · ${title}`,
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
