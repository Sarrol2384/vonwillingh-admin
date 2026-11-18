import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatZar } from "./money";
import {
  buildInvoiceWhatsAppShare,
  invoiceGreetingName,
  normaliseSaWhatsAppPhone,
  otherUnpaidForWhatsApp,
  whatsAppPhoneHint,
  type WhatsAppClientInvoice,
} from "./whatsapp";

const VIEW_URL =
  "https://vonwillingh-admin.vercel.app/invoice/sampletoken";

describe("normaliseSaWhatsAppPhone", () => {
  test("turns mixed South African formats into international digits", () => {
    assert.equal(normaliseSaWhatsAppPhone("+27 82 306 3316"), "27823063316");
    assert.equal(normaliseSaWhatsAppPhone("082 306 3316"), "27823063316");
    assert.equal(normaliseSaWhatsAppPhone("0823063316"), "27823063316");
    assert.equal(normaliseSaWhatsAppPhone("27823063316"), "27823063316");
    assert.equal(normaliseSaWhatsAppPhone("0027 82 306 3316"), "27823063316");
    assert.equal(
      normaliseSaWhatsAppPhone("+27 (0) 82 306 3316"),
      "27823063316",
    );
    assert.equal(
      normaliseSaWhatsAppPhone("082 306 3316 (WhatsApp)"),
      "27823063316",
    );
    assert.equal(normaliseSaWhatsAppPhone("021 555 1234"), "27215551234");
    assert.equal(normaliseSaWhatsAppPhone("823063316"), "27823063316");
  });

  test("returns null when there is nothing WhatsApp can dial", () => {
    assert.equal(normaliseSaWhatsAppPhone(""), null);
    assert.equal(normaliseSaWhatsAppPhone("   "), null);
    assert.equal(normaliseSaWhatsAppPhone(null), null);
    assert.equal(normaliseSaWhatsAppPhone("call me"), null);
    assert.equal(normaliseSaWhatsAppPhone("12345"), null);
  });
});

describe("invoiceGreetingName", () => {
  test("uses the contact first name, then the client name", () => {
    assert.equal(invoiceGreetingName("Victor Naidoo", "Acme"), "Victor");
    assert.equal(invoiceGreetingName("Victor", "Acme"), "Victor");
    assert.equal(invoiceGreetingName("", "Sweet Victory"), "Sweet Victory");
    assert.equal(invoiceGreetingName("  ", null), "there");
  });
});

describe("buildInvoiceWhatsAppShare", () => {
  test("builds the owner's invoice message and a click-to-chat link", () => {
    const share = buildInvoiceWhatsAppShare({
      clientName: "Victor",
      businessName: "Victor's Studio",
      phone: "+27 82 306 3316",
      number: "INV-2026-0007",
      total: 485,
      balance: 485,
      issueDate: "2026-11-12",
      dueDate: "2026-11-26",
      companyName: "VonWillingh Online",
      senderName: "Sarrol Von Willingh",
      viewUrl: VIEW_URL,
    });

    assert.equal(
      share.message,
      [
        "Hi Victor,",
        `Please find invoice INV-2026-0007 from VonWillingh Online for ${formatZar(485)}, issued 12 November, due 26 November.`,
        `You can view the invoice and pay online here:\n${VIEW_URL}`,
        "Please use the link above when making payment, so the payment is matched to the right invoice.",
        "Kind regards,\nSarrol Von Willingh\nVonWillingh Online",
      ].join("\n\n"),
    );
    assert.equal(share.phone, "27823063316");
    assert.equal(share.settled, false);
    assert.equal(share.hint, null);
    assert.equal(share.message.toLowerCase().includes("vat"), false);

    const url = new URL(share.href);
    assert.equal(url.origin, "https://wa.me");
    assert.equal(url.pathname, "/27823063316");
    assert.equal(url.searchParams.get("text"), share.message);
    assert.equal(share.href.includes("\n"), false);
  });

  test("mentions a credit when payments reduce the amount still due", () => {
    const share = buildInvoiceWhatsAppShare({
      clientName: "Victor Naidoo",
      phone: "082 306 3316",
      number: "INV-2026-0007",
      total: 599,
      balance: 497,
      issueDate: "2026-11-12",
      dueDate: "2026-11-26",
      companyName: "VonWillingh Online",
      senderName: "Sarrol Von Willingh",
      viewUrl: VIEW_URL,
    });

    assert.match(share.message, /^Hi Victor,/);
    assert.match(
      share.message,
      new RegExp(
        `A credit of ${escapeRegExp(formatZar(102))} has been applied, so the amount due is ${escapeRegExp(formatZar(497))}\\.`,
      ),
    );
    assert.match(share.message, /pay online here/);
  });

  test("words a fully paid invoice as a receipt", () => {
    const share = buildInvoiceWhatsAppShare({
      clientName: "Victor",
      phone: "082 306 3316",
      number: "INV-2026-0007",
      total: 485,
      balance: 0,
      issueDate: "2026-11-12",
      dueDate: "2026-11-26",
      companyName: "VonWillingh Online",
      senderName: "Sarrol Von Willingh",
      viewUrl: VIEW_URL,
    });

    assert.equal(share.settled, true);
    assert.match(
      share.message,
      /is paid in full \(issued 12 November, due 26 November\)\. Thank you\./,
    );
    assert.equal(share.message.includes("pay online"), false);
    assert.equal(share.message.includes("A credit of"), false);
    assert.match(share.message, /You can view the invoice here:/);
    assert.equal(share.message.includes("previous invoices"), false);
    assert.match(share.message, /Please use the link above when making payment/);
  });

  test("lists the client's other unpaid invoices, oldest first", () => {
    const older = "https://vonwillingh-admin.vercel.app/invoice/older";
    const newer = "https://vonwillingh-admin.vercel.app/invoice/newer";
    const share = buildInvoiceWhatsAppShare({
      clientName: "Victor",
      phone: "+27 82 306 3316",
      number: "INV-2026-0007",
      total: 485,
      balance: 485,
      issueDate: "2026-11-12",
      dueDate: "2026-11-26",
      companyName: "VonWillingh Online",
      senderName: "Sarrol Von Willingh",
      viewUrl: VIEW_URL,
      otherInvoices: [
        {
          number: "INV-2026-0006",
          balance: 120,
          dueDate: "2026-12-01",
          issueDate: "2026-11-01",
          viewUrl: newer,
        },
        {
          number: "INV-2026-0005",
          balance: 970,
          dueDate: "2026-11-20",
          issueDate: "2026-10-20",
          viewUrl: older,
        },
      ],
    });

    const olderLine = `INV-2026-0005 for ${formatZar(970)}, due 20 November:\n${older}`;
    const newerLine = `INV-2026-0006 for ${formatZar(120)}, due 1 December:\n${newer}`;
    const section = share.message.indexOf("Your previous invoices are also still unpaid:");
    assert.ok(section > share.message.indexOf(VIEW_URL));
    assert.ok(share.message.indexOf(olderLine) < share.message.indexOf(newerLine));
    assert.match(
      share.message,
      /Please use the links above when making payment, so each payment is matched to the right invoice\./,
    );
    assert.equal(share.message.toLowerCase().includes("vat"), false);
  });

  test("mentions other unpaid invoices on a paid receipt", () => {
    const share = buildInvoiceWhatsAppShare({
      clientName: "Victor",
      phone: "082 306 3316",
      number: "INV-2026-0007",
      total: 485,
      balance: 0,
      issueDate: "2026-11-12",
      dueDate: "2026-11-26",
      companyName: "VonWillingh Online",
      senderName: "Sarrol Von Willingh",
      viewUrl: VIEW_URL,
      otherInvoices: [
        {
          number: "INV-2026-0005",
          balance: 970,
          dueDate: "2026-11-20",
          issueDate: "2026-10-20",
          viewUrl: "https://vonwillingh-admin.vercel.app/invoice/older",
        },
      ],
    });

    assert.match(share.message, /is paid in full/);
    assert.match(share.message, /Your previous invoices are also still unpaid:\nINV-2026-0005/);
    assert.match(share.message, /Please use the links above/);
    assert.equal(share.message.includes("pay online"), false);
  });

  test("opens WhatsApp with only the text when the client has no usable number", () => {
    const missing = buildInvoiceWhatsAppShare({
      clientName: "Victor",
      phone: "",
      number: "INV-2026-0007",
      total: 485,
      balance: 485,
      issueDate: "2026-11-12",
      companyName: "",
      senderName: "",
      viewUrl: VIEW_URL,
    });
    assert.equal(missing.phone, null);
    assert.match(missing.hint ?? "", /No phone number/);
    assert.equal(new URL(missing.href).pathname, "/");
    assert.equal(new URL(missing.href).searchParams.get("text"), missing.message);
    assert.match(missing.message, /VonWillingh Online/);
    assert.equal(missing.message.includes("Kind regards,\nVonWillingh Online\nVonWillingh Online"), false);

    const invalid = buildInvoiceWhatsAppShare({
      clientName: "Victor",
      phone: "123",
      number: "INV-2026-0007",
      total: 485,
      balance: 485,
      issueDate: "2026-11-12",
      viewUrl: null,
    });
    assert.match(invalid.hint ?? "", /isn't in a WhatsApp format/);
    assert.equal(invalid.message.includes("http"), false);
    assert.equal(whatsAppPhoneHint("082 306 3316"), null);
    assert.equal(invalid.message.includes("Please use the link above"), false);
  });
});

describe("otherUnpaidForWhatsApp", () => {
  test("keeps unpaid invoices except the current one, oldest first", () => {
    const rows: WhatsAppClientInvoice[] = [
      row("current", "INV-2026-0007", "2026-11-12", "sent", 485, true),
      row("newer", "INV-2026-0006", "2026-11-01", "draft", 120, false),
      row("older", "INV-2026-0005", "2026-10-20", "sent", 970, true),
      row("paid", "INV-2026-0004", "2026-09-01", "paid", 0, true),
      row("voided", "INV-2026-0003", "2026-08-01", "void", 400, true),
      row("quote", "QUO-2026-0001", "2026-07-01", "sent", 50, true, "quote"),
    ];

    const result = otherUnpaidForWhatsApp("current", rows);
    assert.deepEqual(
      result.invoices.map((invoice) => invoice.number),
      ["INV-2026-0005", "INV-2026-0006"],
    );
    assert.equal(result.tokensReady, false);

    const ready = otherUnpaidForWhatsApp("current", [
      row("current", "INV-2026-0007", "2026-11-12", "sent", 485, true),
      row("older", "INV-2026-0005", "2026-10-20", "sent", 970, true),
    ]);
    assert.equal(ready.tokensReady, true);
  });
});

function row(
  id: string,
  number: string,
  issueDate: string,
  status: string,
  balance: number,
  hasPublicToken: boolean,
  type = "invoice",
): WhatsAppClientInvoice {
  return {
    id,
    type,
    status,
    number,
    issueDate,
    balance,
    hasPublicToken,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
