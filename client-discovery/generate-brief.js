/**
 * Generates VonWillingh Online Website Discovery Meeting Brief (DOCX + PDF).
 * Run: node generate-brief.js
 */
const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  PageNumber,
  Footer,
  Header,
} = require("docx");
const PDFDocument = require("pdfkit");

const OUT_DIR = __dirname;
const BRAND = {
  company: "VonWillingh Online",
  contact: "Sarrol Von Willingh",
  email: "admin@vonwillingh.co.za",
  phone: "081 216 3629",
  web: "https://vonwillingh.co.za",
  address: "177 Magdouw Street, Russel's Rest, Eerste River, 7100",
};

const ACCENT = "1A4D6D";
const MUTED = "555555";
const LINE = "CCCCCC";

function blank(label, width = 40) {
  return `${label} ${"_".repeat(width)}`;
}

function sectionTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text, bold: true, color: ACCENT, size: 26, font: "Calibri" }),
    ],
  });
}

function subTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({ text, bold: true, color: ACCENT, size: 22, font: "Calibri" }),
    ],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        size: 20,
        font: "Calibri",
        color: opts.muted ? MUTED : "222222",
        italics: !!opts.italics,
      }),
    ],
  });
}

function tip(text) {
  return new Paragraph({
    spacing: { after: 60 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 },
    },
    indent: { left: 120 },
    children: [
      new TextRun({ text: "Suggestion: ", bold: true, size: 18, font: "Calibri", color: ACCENT }),
      new TextRun({ text, size: 18, font: "Calibri", color: MUTED, italics: true }),
    ],
  });
}

function check(text) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: "☐  ", size: 20, font: "Calibri" }),
      new TextRun({ text, size: 20, font: "Calibri" }),
    ],
  });
}

function fillLine(label) {
  return new Paragraph({
    spacing: { after: 70 },
    children: [
      new TextRun({ text: `${label} `, size: 20, font: "Calibri", bold: true }),
      new TextRun({ text: "_".repeat(52), size: 20, font: "Calibri", color: "AAAAAA" }),
    ],
  });
}

function fillBlock(label, lines = 2) {
  const paras = [
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: label, size: 20, font: "Calibri", bold: true })],
    }),
  ];
  for (let i = 0; i < lines; i++) {
    paras.push(
      new Paragraph({
        spacing: { after: 50 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 1 },
        },
        children: [new TextRun({ text: " ", size: 20, font: "Calibri" })],
      })
    );
  }
  return paras;
}

function twoCol(leftLabel, rightLabel) {
  const cell = (label) =>
    new TableCell({
      width: { size: 4680, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
      children: [
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${label} `, bold: true, size: 20, font: "Calibri" }),
            new TextRun({ text: "_".repeat(28), size: 20, font: "Calibri", color: "AAAAAA" }),
          ],
        }),
      ],
    });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [new TableRow({ children: [cell(leftLabel), cell(rightLabel)] })],
  });
}

function buildDocxChildren() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: BRAND.company.toUpperCase(),
          bold: true,
          size: 36,
          font: "Calibri",
          color: ACCENT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "Custom web applications & websites for South African businesses",
          size: 18,
          font: "Calibri",
          color: MUTED,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 4 },
      },
      children: [
        new TextRun({
          text: "WEBSITE / WEB APP DISCOVERY MEETING BRIEF",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "222222",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 160 },
      children: [
        new TextRun({
          text: `${BRAND.email}  ·  ${BRAND.phone}  ·  ${BRAND.web}`,
          size: 16,
          font: "Calibri",
          color: MUTED,
        }),
      ],
    }),

    body(
      "Use this brief in the discovery meeting. Tick what applies, fill blanks, and capture enough detail to prepare an accurate quotation afterward."
    ),

    sectionTitle("1. Meeting details"),
    twoCol("Meeting date:", "Prepared by:"),
    twoCol("Client attendees:", "VonWillingh attendees:"),
    fillLine("Project working title:"),
    fillLine("How they found us:"),

    sectionTitle("2. Client & business"),
    twoCol("Legal / trading name:", "Industry / niche:"),
    twoCol("Primary contact:", "Role / title:"),
    twoCol("Phone / WhatsApp:", "Email:"),
    fillLine("Business address / service area:"),
    fillLine("Existing website (if any):"),
    fillLine("Social media (FB / IG / TikTok / LinkedIn):"),
    fillLine("Competitors or sites they admire:"),
    ...fillBlock("What does the business do? (1-2 sentences)", 2),
    tip(
      "Ask who their ideal customer is and what a 'good month' looks like - it shapes homepage messaging and CTAs."
    ),

    sectionTitle("3. Project type (scope path)"),
    body(
      "VonWillingh builds starter / brochure websites and full custom web applications (see vonwillingh.co.za). Confirm which path fits - or a phased plan (site first, app later)."
    ),
    check("Starter / brochure website (info site, branding, contact & lead capture)"),
    check("Business website with extras (gallery, blog, bookings, basic shop, etc.)"),
    check("Custom web application (logins, dashboards, workflows, databases, integrations)"),
    check("Phased: launch a website now, plan a custom app later"),
    check("Unsure - need recommendation after discovery"),
    ...fillBlock("If custom web app: what problem should the system solve?", 2),
    check("Staff / admin portal"),
    check("Client / customer portal"),
    check("Bookings / appointments / jobs"),
    check("Quotes, invoices, or CRM-style tools"),
    check("Inventory / stock / orders"),
    check("Payments / subscriptions"),
    check("Integrations (WhatsApp, PayFast/Ozow, Xero/Sage, Google, other)"),
    fillLine("Other systems they use today (spreadsheets, WhatsApp, paper, software):"),
    tip(
      "Custom apps are for when they outgrow a brochure site - e.g. staff logins, automated workflows, or a live cloud system on modern stack (Next.js, Supabase, Vercel)."
    ),

    sectionTitle("4. Goals & success"),
    check("Generate leads / enquiries"),
    check("Take bookings or sell online"),
    check("Look credible / professional"),
    check("Replace manual admin / paperwork"),
    check("Inform customers (hours, services, prices, location)"),
    check("Other: ________________________________"),
    fillLine("Primary goal (pick one):"),
    fillLine("Target audience:"),
    fillLine("Success in 3-6 months looks like:"),
    ...fillBlock("Why do they want this now?", 2),

    sectionTitle("5. Brand & design"),
    check("Logo ready (vector/PNG preferred)"),
    check("Logo needs redesign / new logo"),
    check("No logo yet - include in quote"),
    fillLine("Brand colours (hex or samples):"),
    fillLine("Fonts / style words (e.g. clean, bold, warm, premium):"),
    fillLine("Reference sites they LIKE:"),
    fillLine("Reference sites they DISLIKE (and why):"),
    check("Photos / video available from client"),
    check("Need stock photos / photo shoot advice"),
    tip(
      "Even a simple site should feel branded: logo, 1-2 colours, clear type, real photos of their work - not generic template stock."
    ),

    sectionTitle("6. Sitemap & pages (websites)"),
    check("Home"),
    check("About"),
    check("Services / Products"),
    check("Gallery / Portfolio"),
    check("Pricing"),
    check("Testimonials / Reviews"),
    check("Blog / News"),
    check("FAQ"),
    check("Contact"),
    check("Booking page"),
    check("Shop / Catalogue"),
    check("Other: ________________________________"),
    fillLine("Estimated page count:"),
    ...fillBlock("Homepage message / offer (what should visitors do first?)", 2),

    sectionTitle("7. Features & functionality"),
    subTitle("Usually included / recommended"),
    check("Mobile-friendly design"),
    check("Contact form (POPIA consent)"),
    check("Click-to-WhatsApp / click-to-call"),
    check("Google Maps / directions"),
    check("Basic SEO (titles, meta, sitemap)"),
    check("Google Analytics / search console"),
    check("SSL / HTTPS hosting"),
    subTitle("Optional add-ons (quote separately)"),
    check("Online bookings"),
    check("E-commerce / payments"),
    check("Blog / CMS for client editing"),
    check("Multi-language"),
    check("Newsletter signup"),
    check("Member / client login"),
    check("Custom web app modules (see section 3)"),
    tip(
      "For most local businesses: mobile-first site + WhatsApp CTA + Google Business Profile + basic SEO beats a bloated feature list."
    ),

    sectionTitle("8. Content, domain & hosting"),
    check("Client will supply all copy"),
    check("VonWillingh to draft / polish copy"),
    check("Client supplies images"),
    check("Need help sourcing images"),
    fillLine("Domain name (have / want):"),
    check("Domain already owned - registrar: ________________"),
    check("Need to register a domain"),
    check("Business email needed (@theirbrand)"),
    check("Hosting preference discussed (e.g. Vercel / existing host)"),
    fillLine("Who owns domain & accounts after launch?"),

    sectionTitle("9. Access & accounts to collect later"),
    check("Domain registrar login"),
    check("Current hosting / website login"),
    check("Google Business Profile"),
    check("Social media admin access (as needed)"),
    check("Analytics / ads accounts"),
    body("Do not collect passwords in this form - arrange secure handoff after deposit.", {
      muted: true,
      italics: true,
    }),

    sectionTitle("10. Timeline, budget & decision"),
    fillLine("Ideal go-live date:"),
    fillLine("Hard deadline / event:"),
    fillLine("Decision-maker(s):"),
    check("Budget discussed (optional): under R5k  /  R5-15k  /  R15-40k  /  R40k+  /  TBD"),
    check("Aware of starter website intro offer (from R1,999 once-off setup) - if eligible"),
    tip(
      "Budget bands help scope honestly. Starter sites and custom apps are priced differently - confirm path before quoting."
    ),

    sectionTitle("11. Quotation checklist (internal)"),
    check("Project path clear (website / app / phased)"),
    check("Page count & features listed"),
    check("Brand assets status noted"),
    check("Content ownership agreed"),
    check("Hosting / domain / email included or excluded"),
    check("Care / support plan mentioned (monthly hosting & updates)"),
    check("Out of scope noted"),
    fillLine("Proposal / quote due date:"),
    fillLine("Estimated complexity: Low / Medium / High"),
    ...fillBlock("Notes for quotation", 3),
    ...fillBlock("Agreed next steps", 2),

    sectionTitle("12. Meeting talking points (suggestions)"),
    body(
      "• We build hand-coded modern sites - not WordPress drag-and-drop templates."
    ),
    body(
      "• Starter websites: professional, mobile-friendly, branding, contact + WhatsApp, HTTPS hosting."
    ),
    body(
      "• Custom web apps: when they need logins, workflows, dashboards, or systems that replace spreadsheets/WhatsApp admin."
    ),
    body("• Process: Discover → Build → Launch (training) → Support (care plan)."),
    body("• After this meeting: written quotation with clear scope, timeline, and deposit terms."),
    body(`• More examples & services: ${BRAND.web}`),

    new Paragraph({ spacing: { before: 300 }, children: [] }),
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 8, color: LINE, space: 8 },
      },
      spacing: { before: 100 },
      children: [
        new TextRun({
          text: `${BRAND.company}  ·  ${BRAND.email}  ·  ${BRAND.phone}  ·  ${BRAND.address}`,
          size: 14,
          font: "Calibri",
          color: MUTED,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 40 },
      children: [
        new TextRun({
          text: "Confidential - for project discovery and quotation purposes only.",
          size: 14,
          font: "Calibri",
          color: MUTED,
          italics: true,
        }),
      ],
    }),
  ];
}

async function writeDocx() {
  const doc = new Document({
    creator: BRAND.company,
    title: "Website / Web App Discovery Meeting Brief",
    description: "Client discovery checklist for quotation",
    styles: {
      default: {
        document: {
          styles: [{ id: "Normal", run: { font: "Calibri", size: 20 } }],
        },
      },
    },
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
                    text: `${BRAND.company} · Discovery Brief`,
                    size: 14,
                    font: "Calibri",
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
                    text: `${BRAND.email}  ·  Page `,
                    size: 14,
                    font: "Calibri",
                    color: MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 14,
                    font: "Calibri",
                    color: MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children: buildDocxChildren(),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const out = path.join(OUT_DIR, "Website-Discovery-Meeting-Brief.docx");
  fs.writeFileSync(out, buffer);
  return out;
}

/** PDF helpers */
function pdfHeader(doc) {
  doc
    .fillColor(`#${ACCENT}`)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(BRAND.company.toUpperCase(), { align: "center" });
  doc
    .fillColor(`#${MUTED}`)
    .font("Helvetica-Oblique")
    .fontSize(9)
    .text("Custom web applications & websites for South African businesses", {
      align: "center",
    });
  doc.moveDown(0.3);
  doc
    .fillColor("#222222")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("WEBSITE / WEB APP DISCOVERY MEETING BRIEF", { align: "center" });
  doc
    .moveTo(50, doc.y + 4)
    .lineTo(545, doc.y + 4)
    .strokeColor(`#${ACCENT}`)
    .lineWidth(1.5)
    .stroke();
  doc.moveDown(0.6);
  doc
    .fillColor(`#${MUTED}`)
    .font("Helvetica")
    .fontSize(8)
    .text(`${BRAND.email}  |  ${BRAND.phone}  |  ${BRAND.web}`, { align: "center" });
  doc.moveDown(0.8);
}

function ensureSpace(doc, needed = 60) {
  const limit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > limit) doc.addPage();
}

function pdfSection(doc, title) {
  ensureSpace(doc, 80);
  doc.moveDown(0.4);
  doc.fillColor(`#${ACCENT}`).font("Helvetica-Bold").fontSize(11).text(title);
  doc.moveDown(0.25);
}

function pdfSub(doc, title) {
  ensureSpace(doc, 50);
  doc.fillColor(`#${ACCENT}`).font("Helvetica-Bold").fontSize(9.5).text(title);
  doc.moveDown(0.15);
}

function pdfBody(doc, text, opts = {}) {
  ensureSpace(doc, 40);
  doc
    .fillColor(opts.muted ? `#${MUTED}` : "#222222")
    .font(opts.italics ? "Helvetica-Oblique" : "Helvetica")
    .fontSize(9)
    .text(text, { align: "left" });
  doc.moveDown(0.15);
}

function pdfTip(doc, text) {
  ensureSpace(doc, 55);
  const x = 50;
  const startY = doc.y;
  doc.save();
  doc.rect(x, startY, 3, 12).fill(`#${ACCENT}`);
  doc.restore();
  doc
    .fillColor(`#${ACCENT}`)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Suggestion: ", x + 10, startY, { continued: true, width: 480 });
  doc.fillColor(`#${MUTED}`).font("Helvetica-Oblique").fontSize(8).text(text);
  doc.x = x;
  doc.moveDown(0.35);
}

function pdfCheck(doc, text) {
  ensureSpace(doc, 28);
  doc.fillColor("#222222").font("Helvetica").fontSize(9).text(`[ ]  ${text}`);
  doc.moveDown(0.08);
}

function pdfFill(doc, label) {
  ensureSpace(doc, 28);
  doc
    .fillColor("#222222")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(`${label} `, { continued: true });
  doc.fillColor("#AAAAAA").font("Helvetica").text("_".repeat(48));
  doc.moveDown(0.12);
}

function pdfFillBlock(doc, label, lines = 2) {
  ensureSpace(doc, 40 + lines * 18);
  doc.fillColor("#222222").font("Helvetica-Bold").fontSize(9).text(label);
  for (let i = 0; i < lines; i++) {
    doc.moveDown(0.35);
    const y = doc.y;
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor(`#${LINE}`)
      .lineWidth(0.5)
      .stroke();
  }
  doc.moveDown(0.4);
}

function writePdf() {
  return new Promise((resolve, reject) => {
    const out = path.join(OUT_DIR, "Website-Discovery-Meeting-Brief.pdf");
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      info: {
        Title: "Website / Web App Discovery Meeting Brief",
        Author: BRAND.company,
      },
    });
    const stream = fs.createWriteStream(out);
    doc.pipe(stream);

    pdfHeader(doc);
    pdfBody(
      doc,
      "Use this brief in the discovery meeting. Tick what applies, fill blanks, and capture enough detail to prepare an accurate quotation afterward."
    );

    pdfSection(doc, "1. Meeting details");
    pdfFill(doc, "Meeting date:");
    pdfFill(doc, "Prepared by:");
    pdfFill(doc, "Client attendees:");
    pdfFill(doc, "VonWillingh attendees:");
    pdfFill(doc, "Project working title:");
    pdfFill(doc, "How they found us:");

    pdfSection(doc, "2. Client & business");
    pdfFill(doc, "Legal / trading name:");
    pdfFill(doc, "Industry / niche:");
    pdfFill(doc, "Primary contact:");
    pdfFill(doc, "Role / title:");
    pdfFill(doc, "Phone / WhatsApp:");
    pdfFill(doc, "Email:");
    pdfFill(doc, "Business address / service area:");
    pdfFill(doc, "Existing website (if any):");
    pdfFill(doc, "Social media:");
    pdfFill(doc, "Competitors or sites they admire:");
    pdfFillBlock(doc, "What does the business do? (1-2 sentences)", 2);
    pdfTip(
      doc,
      "Ask who their ideal customer is and what a 'good month' looks like - it shapes homepage messaging and CTAs."
    );

    pdfSection(doc, "3. Project type (scope path)");
    pdfBody(
      doc,
      "VonWillingh builds starter / brochure websites and full custom web applications (see vonwillingh.co.za). Confirm which path fits - or a phased plan (site first, app later)."
    );
    pdfCheck(doc, "Starter / brochure website (info site, branding, contact & lead capture)");
    pdfCheck(doc, "Business website with extras (gallery, blog, bookings, basic shop, etc.)");
    pdfCheck(doc, "Custom web application (logins, dashboards, workflows, databases, integrations)");
    pdfCheck(doc, "Phased: launch a website now, plan a custom app later");
    pdfCheck(doc, "Unsure - need recommendation after discovery");
    pdfFillBlock(doc, "If custom web app: what problem should the system solve?", 2);
    pdfCheck(doc, "Staff / admin portal");
    pdfCheck(doc, "Client / customer portal");
    pdfCheck(doc, "Bookings / appointments / jobs");
    pdfCheck(doc, "Quotes, invoices, or CRM-style tools");
    pdfCheck(doc, "Inventory / stock / orders");
    pdfCheck(doc, "Payments / subscriptions");
    pdfCheck(doc, "Integrations (WhatsApp, PayFast/Ozow, Xero/Sage, Google, other)");
    pdfFill(doc, "Other systems they use today:");
    pdfTip(
      doc,
      "Custom apps are for when they outgrow a brochure site - e.g. staff logins, automated workflows, or a live cloud system (Next.js, Supabase, Vercel)."
    );

    pdfSection(doc, "4. Goals & success");
    pdfCheck(doc, "Generate leads / enquiries");
    pdfCheck(doc, "Take bookings or sell online");
    pdfCheck(doc, "Look credible / professional");
    pdfCheck(doc, "Replace manual admin / paperwork");
    pdfCheck(doc, "Inform customers (hours, services, prices, location)");
    pdfCheck(doc, "Other: ________________________________");
    pdfFill(doc, "Primary goal (pick one):");
    pdfFill(doc, "Target audience:");
    pdfFill(doc, "Success in 3-6 months looks like:");
    pdfFillBlock(doc, "Why do they want this now?", 2);

    pdfSection(doc, "5. Brand & design");
    pdfCheck(doc, "Logo ready (vector/PNG preferred)");
    pdfCheck(doc, "Logo needs redesign / new logo");
    pdfCheck(doc, "No logo yet - include in quote");
    pdfFill(doc, "Brand colours (hex or samples):");
    pdfFill(doc, "Fonts / style words:");
    pdfFill(doc, "Reference sites they LIKE:");
    pdfFill(doc, "Reference sites they DISLIKE:");
    pdfCheck(doc, "Photos / video available from client");
    pdfCheck(doc, "Need stock photos / photo shoot advice");
    pdfTip(
      doc,
      "Even a simple site should feel branded: logo, 1-2 colours, clear type, real photos of their work."
    );

    pdfSection(doc, "6. Sitemap & pages (websites)");
    [
      "Home",
      "About",
      "Services / Products",
      "Gallery / Portfolio",
      "Pricing",
      "Testimonials / Reviews",
      "Blog / News",
      "FAQ",
      "Contact",
      "Booking page",
      "Shop / Catalogue",
      "Other: ________________________________",
    ].forEach((t) => pdfCheck(doc, t));
    pdfFill(doc, "Estimated page count:");
    pdfFillBlock(doc, "Homepage message / offer (what should visitors do first?)", 2);

    pdfSection(doc, "7. Features & functionality");
    pdfSub(doc, "Usually included / recommended");
    [
      "Mobile-friendly design",
      "Contact form (POPIA consent)",
      "Click-to-WhatsApp / click-to-call",
      "Google Maps / directions",
      "Basic SEO (titles, meta, sitemap)",
      "Google Analytics / search console",
      "SSL / HTTPS hosting",
    ].forEach((t) => pdfCheck(doc, t));
    pdfSub(doc, "Optional add-ons (quote separately)");
    [
      "Online bookings",
      "E-commerce / payments",
      "Blog / CMS for client editing",
      "Multi-language",
      "Newsletter signup",
      "Member / client login",
      "Custom web app modules (see section 3)",
    ].forEach((t) => pdfCheck(doc, t));
    pdfTip(
      doc,
      "For most local businesses: mobile-first + WhatsApp CTA + Google Business + basic SEO beats a bloated feature list."
    );

    pdfSection(doc, "8. Content, domain & hosting");
    pdfCheck(doc, "Client will supply all copy");
    pdfCheck(doc, "VonWillingh to draft / polish copy");
    pdfCheck(doc, "Client supplies images");
    pdfCheck(doc, "Need help sourcing images");
    pdfFill(doc, "Domain name (have / want):");
    pdfCheck(doc, "Domain already owned - registrar: ________________");
    pdfCheck(doc, "Need to register a domain");
    pdfCheck(doc, "Business email needed (@theirbrand)");
    pdfCheck(doc, "Hosting preference discussed");
    pdfFill(doc, "Who owns domain & accounts after launch?");

    pdfSection(doc, "9. Access & accounts to collect later");
    [
      "Domain registrar login",
      "Current hosting / website login",
      "Google Business Profile",
      "Social media admin access (as needed)",
      "Analytics / ads accounts",
    ].forEach((t) => pdfCheck(doc, t));
    pdfBody(doc, "Do not collect passwords in this form - arrange secure handoff after deposit.", {
      muted: true,
      italics: true,
    });

    pdfSection(doc, "10. Timeline, budget & decision");
    pdfFill(doc, "Ideal go-live date:");
    pdfFill(doc, "Hard deadline / event:");
    pdfFill(doc, "Decision-maker(s):");
    pdfCheck(
      doc,
      "Budget discussed (optional): under R5k / R5-15k / R15-40k / R40k+ / TBD"
    );
    pdfCheck(
      doc,
      "Aware of starter website intro offer (from R1,999 once-off setup) - if eligible"
    );
    pdfTip(
      doc,
      "Budget bands help scope honestly. Starter sites and custom apps are priced differently - confirm path before quoting."
    );

    pdfSection(doc, "11. Quotation checklist (internal)");
    [
      "Project path clear (website / app / phased)",
      "Page count & features listed",
      "Brand assets status noted",
      "Content ownership agreed",
      "Hosting / domain / email included or excluded",
      "Care / support plan mentioned",
      "Out of scope noted",
    ].forEach((t) => pdfCheck(doc, t));
    pdfFill(doc, "Proposal / quote due date:");
    pdfFill(doc, "Estimated complexity: Low / Medium / High");
    pdfFillBlock(doc, "Notes for quotation", 3);
    pdfFillBlock(doc, "Agreed next steps", 2);

    pdfSection(doc, "12. Meeting talking points (suggestions)");
    pdfBody(doc, "- We build hand-coded modern sites - not WordPress drag-and-drop templates.");
    pdfBody(
      doc,
      "- Starter websites: professional, mobile-friendly, branding, contact + WhatsApp, HTTPS hosting."
    );
    pdfBody(
      doc,
      "- Custom web apps: when they need logins, workflows, dashboards, or systems that replace spreadsheets/WhatsApp admin."
    );
    pdfBody(doc, "- Process: Discover -> Build -> Launch (training) -> Support (care plan).");
    pdfBody(doc, "- After this meeting: written quotation with clear scope, timeline, and deposit terms.");
    pdfBody(doc, `- More examples & services: ${BRAND.web}`);

    doc.moveDown(1);
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor(`#${LINE}`)
      .lineWidth(0.6)
      .stroke();
    doc.moveDown(0.4);
    doc
      .fillColor(`#${MUTED}`)
      .font("Helvetica")
      .fontSize(7)
      .text(
        `${BRAND.company}  |  ${BRAND.email}  |  ${BRAND.phone}  |  ${BRAND.address}`
      );
    doc
      .font("Helvetica-Oblique")
      .text("Confidential - for project discovery and quotation purposes only.");

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc
        .fontSize(7)
        .fillColor(`#${MUTED}`)
        .font("Helvetica")
        .text(`${BRAND.email}  |  Page ${i + 1} of ${range.count}`, 50, doc.page.height - 35, {
          width: 495,
          align: "center",
          lineBreak: false,
        });
    }

    doc.end();
    stream.on("finish", () => resolve(out));
    stream.on("error", reject);
  });
}

(async () => {
  const docxPath = await writeDocx();
  console.log("Wrote:", docxPath);

  const { spawnSync } = require("child_process");
  const print = spawnSync(process.execPath, [path.join(__dirname, "print-pdf.js")], {
    encoding: "utf8",
  });
  if (print.stdout) process.stdout.write(print.stdout);
  if (print.status !== 0) {
    if (print.stderr) process.stderr.write(print.stderr);
    console.warn("PDF print failed — open Website-Discovery-Meeting-Brief.html and print to PDF manually.");
    process.exitCode = 1;
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
