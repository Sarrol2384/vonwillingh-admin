import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatZar } from "./money";
import {
  buildInvoiceWhatsAppShare,
  invoiceGreetingName,
  normaliseSaWhatsAppPhone,
  whatsAppPhoneHint,
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
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
