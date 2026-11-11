import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
  buildPayfastCheckout,
  checkoutParamString,
  confirmItnWithPayfast,
  evaluatePayfastItn,
  fieldsFromFormData,
  generatePayfastSignature,
  invoiceCanBePaidOnline,
  isPayfastSourceIp,
  itnParamString,
  itnSignatureIsValid,
  md5Hex,
  payfastAmountMatches,
  payfastCandidateIps,
  payfastNotifyUrl,
  payfastUrlEncode,
  readPayfastConfig,
  withPassphrase,
  type PayfastField,
} from "./payfast";
import { payNowPostPath } from "./payfast-url";

const DOCUMENTED_FIELDS: PayfastField[] = [
  { name: "merchant_id", value: "10000100" },
  { name: "merchant_key", value: "46f0cd694581a" },
  { name: "return_url", value: "http://www.yourdomain.co.za/return.php" },
  { name: "cancel_url", value: "http://www.yourdomain.co.za/cancel.php" },
  { name: "notify_url", value: "http://www.yourdomain.co.za/notify.php" },
  { name: "name_first", value: "First Name" },
  { name: "name_last", value: "Last Name" },
  { name: "email_address", value: "test@test.com" },
  { name: "m_payment_id", value: "1234" },
  { name: "amount", value: "10.00" },
  { name: "item_name", value: "Order#123" },
];

const DOCUMENTED_PASSPHRASE = "jt7NOE43FZPn";

const DOCUMENTED_SOURCE =
  "merchant_id=10000100&merchant_key=46f0cd694581a&return_url=http%3A%2F%2Fwww.yourdomain.co.za%2Freturn.php&cancel_url=http%3A%2F%2Fwww.yourdomain.co.za%2Fcancel.php&notify_url=http%3A%2F%2Fwww.yourdomain.co.za%2Fnotify.php&name_first=First+Name&name_last=Last+Name&email_address=test%40test.com&m_payment_id=1234&amount=10.00&item_name=Order%23123&passphrase=jt7NOE43FZPn";

const DOCUMENT_ID = "11111111-1111-4111-8111-111111111111";

const ITN_PARAM =
  "m_payment_id=11111111-1111-4111-8111-111111111111&pf_payment_id=1089250&payment_status=COMPLETE&item_name=INV-100&item_description=&amount_gross=200.00&custom_str1=11111111-1111-4111-8111-111111111111&name_first=First+Name&merchant_id=10000100";

const ITN_SIGNATURE = "3a9f1c123721e35de623970b38a11d1c";
const CANCELLED_SIGNATURE = "4b57c18eed2da339d090b58b6f5933bd";

function itnFields(status = "COMPLETE", signature = ITN_SIGNATURE): PayfastField[] {
  return [
    { name: "m_payment_id", value: DOCUMENT_ID },
    { name: "pf_payment_id", value: "1089250" },
    { name: "payment_status", value: status },
    { name: "item_name", value: "INV-100" },
    { name: "item_description", value: "" },
    { name: "amount_gross", value: "200.00" },
    { name: "custom_str1", value: DOCUMENT_ID },
    { name: "name_first", value: "First Name" },
    { name: "merchant_id", value: "10000100" },
    { name: "signature", value: signature },
  ];
}

const savedEnv = {
  PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
  PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY,
  PAYFAST_PASSPHRASE: process.env.PAYFAST_PASSPHRASE,
  PAYFAST_MODE: process.env.PAYFAST_MODE,
  PAYFAST_NOTIFY_URL: process.env.PAYFAST_NOTIFY_URL,
};

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("PayFast signature", () => {
  test("matches PayFast's documented checkout example", () => {
    const source = withPassphrase(
      checkoutParamString(DOCUMENTED_FIELDS),
      DOCUMENTED_PASSPHRASE,
    );
    assert.equal(source, DOCUMENTED_SOURCE);
    assert.equal(
      generatePayfastSignature(DOCUMENTED_FIELDS, DOCUMENTED_PASSPHRASE),
      "8317e2bbd1ae2a6f4f36837e83be4ca9",
    );
  });

  test("encodes spaces as + and the extra PHP characters in uppercase hex", () => {
    assert.equal(payfastUrlEncode("a b~!*()'"), "a+b%7E%21%2A%28%29%27");
    assert.equal(payfastUrlEncode("Order#123"), "Order%23123");
  });

  test("skips blank checkout fields and keeps field order", () => {
    assert.equal(
      checkoutParamString([
        { name: "merchant_id", value: "10000100" },
        { name: "merchant_key", value: "  " },
        { name: "amount", value: "10.00" },
      ]),
      "merchant_id=10000100&amount=10.00",
    );
    const forward = generatePayfastSignature(
      [
        { name: "merchant_id", value: "10000100" },
        { name: "amount", value: "10.00" },
      ],
      null,
    );
    const reversed = generatePayfastSignature(
      [
        { name: "amount", value: "10.00" },
        { name: "merchant_id", value: "10000100" },
      ],
      null,
    );
    assert.notEqual(forward, reversed);
  });

  test("omits a blank passphrase", () => {
    const fields = [{ name: "amount", value: "10.00" }];
    assert.equal(
      generatePayfastSignature(fields, null),
      generatePayfastSignature(fields, "   "),
    );
    assert.notEqual(
      generatePayfastSignature(fields, null),
      generatePayfastSignature(fields, DOCUMENTED_PASSPHRASE),
    );
  });
});

describe("PayFast checkout form", () => {
  test("builds the amount, invoice number, and document id on the server", () => {
    const checkout = buildPayfastCheckout({
      merchantId: "10000100",
      merchantKey: "46f0cd694581a",
      passphrase: DOCUMENTED_PASSPHRASE,
      mode: "sandbox",
      returnUrl: "https://vonwillingh-admin.vercel.app/invoice/token?payment=received",
      cancelUrl: "https://vonwillingh-admin.vercel.app/invoice/token?payment=cancelled",
      notifyUrl: "https://vonwillingh-admin.vercel.app/api/payfast/itn",
      documentId: DOCUMENT_ID,
      amount: 1500.5,
      itemName: "INV-100",
      buyerFirstName: "First",
      buyerLastName: "Name",
      buyerEmail: "not an email",
    });

    assert.equal(checkout.action, "https://sandbox.payfast.co.za/eng/process");
    const values = Object.fromEntries(
      checkout.fields.map((field) => [field.name, field.value]),
    );
    assert.equal(values.amount, "1500.50");
    assert.equal(values.item_name, "INV-100");
    assert.equal(values.m_payment_id, DOCUMENT_ID);
    assert.equal(values.custom_str1, DOCUMENT_ID);
    assert.equal(values.email_address, undefined);
    assert.equal(values.passphrase, undefined);
    const unsigned = checkout.fields.filter((field) => field.name !== "signature");
    assert.equal(
      values.signature,
      generatePayfastSignature(unsigned, DOCUMENTED_PASSPHRASE),
    );
  });

  test("uses the live PayFast host only in live mode", () => {
    const checkout = buildPayfastCheckout({
      merchantId: "10000100",
      merchantKey: "46f0cd694581a",
      passphrase: null,
      mode: "live",
      returnUrl: "https://example.com/return",
      cancelUrl: "https://example.com/cancel",
      notifyUrl: "https://example.com/notify",
      documentId: DOCUMENT_ID,
      amount: 10,
      itemName: "INV-1",
    });
    assert.equal(checkout.action, "https://www.payfast.co.za/eng/process");
  });
});

describe("PayFast ITN validation", () => {
  test("includes blank posted fields and checks the signature", () => {
    const fields = itnFields();
    assert.equal(itnParamString(fields), ITN_PARAM);
    assert.equal(itnSignatureIsValid(fields, DOCUMENTED_PASSPHRASE), true);
    assert.equal(itnSignatureIsValid(fields, "wrong-pass"), false);
    assert.equal(itnSignatureIsValid(fields, null), false);
  });

  test("accepts PayFast host addresses and the published IP ranges", () => {
    assert.equal(isPayfastSourceIp("197.97.145.144", []), true);
    assert.equal(isPayfastSourceIp("197.97.145.159", []), true);
    assert.equal(isPayfastSourceIp("::ffff:197.97.145.150", []), true);
    assert.equal(isPayfastSourceIp("197.97.145.160", []), false);
    assert.equal(isPayfastSourceIp("144.126.193.139", []), true);
    assert.equal(isPayfastSourceIp("144.126.193.140", []), false);
    assert.equal(isPayfastSourceIp("203.0.113.9", []), false);
    assert.equal(isPayfastSourceIp("203.0.113.9", ["203.0.113.9"]), true);
  });

  test("matches the amount due within one cent", () => {
    assert.equal(payfastAmountMatches(200, "200.00"), true);
    assert.equal(payfastAmountMatches(200, "200.01"), true);
    assert.equal(payfastAmountMatches(200, "199.99"), true);
    assert.equal(payfastAmountMatches(200, "200.02"), false);
    assert.equal(payfastAmountMatches(200, "nope"), false);
  });

  test("asks for a server confirm only after the other checks pass", () => {
    const decision = evaluatePayfastItn({
      fields: itnFields(),
      passphrase: DOCUMENTED_PASSPHRASE,
      merchantId: "10000100",
      remoteAddresses: ["197.97.145.150"],
      validHostIps: [],
      lookup: { payable: true, expectedAmount: 200, alreadyRecorded: false },
      serverConfirmed: null,
    });
    assert.equal(decision.action, "confirm");
    if (decision.action !== "confirm") return;
    assert.equal(decision.paramString, ITN_PARAM);
    assert.equal(decision.paramString.includes("passphrase"), false);
    assert.equal(decision.amount, 200);
    assert.equal(decision.pfPaymentId, "1089250");
    assert.equal(decision.documentId, DOCUMENT_ID);
  });

  test("records only a confirmed COMPLETE payment for the amount due", () => {
    const base = {
      fields: itnFields(),
      passphrase: DOCUMENTED_PASSPHRASE,
      merchantId: "10000100",
      remoteAddresses: ["203.0.113.9"],
      validHostIps: ["203.0.113.9"],
      lookup: { payable: true, expectedAmount: 200, alreadyRecorded: false },
    };
    assert.equal(
      evaluatePayfastItn({ ...base, serverConfirmed: true }).action,
      "record",
    );
    assert.deepEqual(
      evaluatePayfastItn({ ...base, serverConfirmed: false }),
      { action: "reject", reason: "PayFast did not confirm the payment" },
    );
    assert.equal(
      evaluatePayfastItn({
        ...base,
        lookup: { payable: true, expectedAmount: 50, alreadyRecorded: false },
        serverConfirmed: null,
      }).action,
      "reject",
    );
  });

  test("rejects a bad signature, a foreign address, and the wrong merchant", () => {
    const base = {
      fields: itnFields(),
      passphrase: DOCUMENTED_PASSPHRASE,
      merchantId: "10000100",
      remoteAddresses: ["197.97.145.150"],
      validHostIps: [],
      serverConfirmed: null,
    };
    assert.equal(
      evaluatePayfastItn({
        ...base,
        fields: itnFields("COMPLETE", "deadbeef"),
      }).action,
      "reject",
    );
    assert.equal(
      evaluatePayfastItn({ ...base, remoteAddresses: ["8.8.8.8"] }).action,
      "reject",
    );
    assert.equal(
      evaluatePayfastItn({ ...base, merchantId: "99999999" }).action,
      "reject",
    );
  });

  test("ignores cancelled and duplicate notifications", () => {
    const cancelled = evaluatePayfastItn({
      fields: itnFields("CANCELLED", CANCELLED_SIGNATURE),
      passphrase: DOCUMENTED_PASSPHRASE,
      merchantId: "10000100",
      remoteAddresses: ["197.97.145.150"],
      validHostIps: [],
      serverConfirmed: null,
    });
    assert.deepEqual(cancelled, {
      action: "acknowledge",
      reason: "not_complete",
    });

    const duplicate = evaluatePayfastItn({
      fields: itnFields(),
      passphrase: DOCUMENTED_PASSPHRASE,
      merchantId: "10000100",
      remoteAddresses: ["197.97.145.150"],
      validHostIps: [],
      lookup: { payable: true, expectedAmount: 0, alreadyRecorded: true },
      serverConfirmed: null,
    });
    assert.deepEqual(duplicate, {
      action: "acknowledge",
      reason: "already_recorded",
    });
  });

  test("does not take payment for a quote, credit note, void invoice, or settled invoice", () => {
    assert.equal(
      invoiceCanBePaidOnline({ type: "invoice", status: "sent", balance: 10 }),
      true,
    );
    assert.equal(
      invoiceCanBePaidOnline({ type: "quote", status: "sent", balance: 10 }),
      false,
    );
    assert.equal(
      invoiceCanBePaidOnline({
        type: "credit_note",
        status: "issued",
        balance: 10,
      }),
      false,
    );
    assert.equal(
      invoiceCanBePaidOnline({ type: "invoice", status: "void", balance: 10 }),
      false,
    );
    assert.equal(
      invoiceCanBePaidOnline({ type: "invoice", status: "paid", balance: 0 }),
      false,
    );

    const rejected = evaluatePayfastItn({
      fields: itnFields(),
      passphrase: DOCUMENTED_PASSPHRASE,
      merchantId: "10000100",
      remoteAddresses: ["197.97.145.150"],
      validHostIps: [],
      lookup: { payable: false, expectedAmount: 200, alreadyRecorded: false },
      serverConfirmed: null,
    });
    assert.deepEqual(rejected, {
      action: "reject",
      reason: "invoice cannot be paid",
    });
  });

  test("rejects an ITN whose custom field points at a different invoice", () => {
    const fields = itnFields();
    const custom = fields.find((field) => field.name === "custom_str1");
    const signature = fields.find((field) => field.name === "signature");
    if (!custom || !signature) throw new Error("missing ITN field");
    custom.value = "22222222-2222-4222-8222-222222222222";
    signature.value = md5Hex(
      withPassphrase(itnParamString(fields), DOCUMENTED_PASSPHRASE),
    );

    const decision = evaluatePayfastItn({
      fields,
      passphrase: DOCUMENTED_PASSPHRASE,
      merchantId: "10000100",
      remoteAddresses: ["197.97.145.150"],
      validHostIps: [],
      serverConfirmed: null,
    });
    assert.deepEqual(decision, {
      action: "reject",
      reason: "invoice reference does not match",
    });
  });

  test("posts the unsigned parameter string back to PayFast", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const ok = await confirmItnWithPayfast(
      ITN_PARAM,
      "sandbox",
      async (url, init) => {
        calls.push({ url: String(url), body: String(init?.body) });
        return new Response("VALID", { status: 200 });
      },
    );
    assert.equal(ok, true);
    assert.equal(
      calls[0]?.url,
      "https://sandbox.payfast.co.za/eng/query/validate",
    );
    assert.equal(calls[0]?.body, ITN_PARAM);

    const invalid = await confirmItnWithPayfast(
      ITN_PARAM,
      "live",
      async () => new Response("INVALID", { status: 200 }),
    );
    assert.equal(invalid, false);
  });

  test("reads the posted body and ignores a protection-bypass query string", async () => {
    const request = new Request(
      "https://preview.vercel.app/api/payfast/itn?x-vercel-protection-bypass=bypass-secret&amount_gross=1.00",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "m_payment_id=11111111-1111-4111-8111-111111111111&payment_status=COMPLETE&amount_gross=200.00",
      },
    );

    const fields = fieldsFromFormData(await request.formData());
    assert.deepEqual(
      fields.map((field) => field.name),
      ["m_payment_id", "payment_status", "amount_gross"],
    );
    assert.equal(
      fields.find((field) => field.name === "amount_gross")?.value,
      "200.00",
    );
    assert.equal(
      new URL(request.url).searchParams.get("x-vercel-protection-bypass"),
      "bypass-secret",
    );
  });

  test("reads the caller address from the proxy headers", () => {
    assert.deepEqual(
      payfastCandidateIps({
        realIp: "197.97.145.150",
        forwardedFor: "203.0.113.9, 10.0.0.1",
      }),
      ["197.97.145.150", "203.0.113.9", "10.0.0.1"],
    );
  });
});

describe("PayFast config", () => {
  test("hides checkout unless the merchant id and key are set", () => {
    delete process.env.PAYFAST_MERCHANT_ID;
    delete process.env.PAYFAST_MERCHANT_KEY;
    delete process.env.PAYFAST_PASSPHRASE;
    delete process.env.PAYFAST_MODE;
    assert.equal(readPayfastConfig(), null);

    process.env.PAYFAST_MERCHANT_ID = "10000100";
    process.env.PAYFAST_MERCHANT_KEY = "46f0cd694581a";
    const sandbox = readPayfastConfig();
    assert.equal(sandbox?.mode, "sandbox");
    assert.equal(sandbox?.passphrase, null);

    process.env.PAYFAST_MODE = "live";
    process.env.PAYFAST_PASSPHRASE = " secret ";
    const live = readPayfastConfig();
    assert.equal(live?.mode, "live");
    assert.equal(live?.passphrase, "secret");

    process.env.PAYFAST_MODE = "nope";
    assert.equal(readPayfastConfig()?.mode, "sandbox");
  });

  test("uses PAYFAST_NOTIFY_URL verbatim, including the protection bypass", () => {
    delete process.env.PAYFAST_NOTIFY_URL;
    assert.equal(
      payfastNotifyUrl("https://vonwillingh-admin.vercel.app"),
      "https://vonwillingh-admin.vercel.app/api/payfast/itn",
    );
    assert.equal(
      payfastNotifyUrl("https://vonwillingh-admin.vercel.app/"),
      "https://vonwillingh-admin.vercel.app/api/payfast/itn",
    );
    process.env.PAYFAST_NOTIFY_URL = "   ";
    assert.equal(
      payfastNotifyUrl("https://vonwillingh-admin.vercel.app"),
      "https://vonwillingh-admin.vercel.app/api/payfast/itn",
    );

    const notifyUrl =
      "https://preview.vercel.app/api/payfast/itn?x-vercel-protection-bypass=bypass-secret";
    process.env.PAYFAST_NOTIFY_URL = `  ${notifyUrl}  `;
    assert.equal(payfastNotifyUrl("https://vonwillingh-admin.vercel.app"), notifyUrl);

    const checkout = buildPayfastCheckout({
      merchantId: "10000100",
      merchantKey: "46f0cd694581a",
      passphrase: DOCUMENTED_PASSPHRASE,
      mode: "sandbox",
      returnUrl: "https://preview.vercel.app/invoice/token?payment=received",
      cancelUrl: "https://preview.vercel.app/invoice/token?payment=cancelled",
      notifyUrl: payfastNotifyUrl("https://vonwillingh-admin.vercel.app"),
      documentId: DOCUMENT_ID,
      amount: 10,
      itemName: "INV-100",
    });
    const notifyField = checkout.fields.find((field) => field.name === "notify_url");
    assert.equal(notifyField?.value, notifyUrl);
    const unsigned = checkout.fields.filter((field) => field.name !== "signature");
    assert.match(
      withPassphrase(checkoutParamString(unsigned), DOCUMENTED_PASSPHRASE),
      /notify_url=https%3A%2F%2Fpreview\.vercel\.app%2Fapi%2Fpayfast%2Fitn%3Fx-vercel-protection-bypass%3Dbypass-secret/,
    );
  });

  test("keeps the Vercel protection bypass on the Pay now POST", () => {
    assert.equal(
      payNowPostPath("abc", ""),
      "/invoice/abc/pay",
    );
    assert.equal(
      payNowPostPath("a/b", "?payment=cancelled"),
      "/invoice/a%2Fb/pay",
    );
    assert.equal(
      payNowPostPath(
        "token",
        "?payment=cancelled&x-vercel-protection-bypass=bypass%20secret&x-vercel-set-bypass-cookie=true",
      ),
      "/invoice/token/pay?x-vercel-protection-bypass=bypass+secret&x-vercel-set-bypass-cookie=true",
    );
  });
});
