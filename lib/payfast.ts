import { createHash, timingSafeEqual } from "node:crypto";
import { resolve4 } from "node:dns/promises";
import { roundMoney } from "@/lib/payments";

/**
 * PayFast signature encoding follows PHP `urlencode`:
 * spaces are `+`, hex is uppercase, and `~!*()' ` are encoded.
 * Checkout signatures skip blank values. ITN signatures keep every
 * posted field except `signature`, including blanks.
 */

export type PayfastMode = "sandbox" | "live";

export type PayfastField = {
  name: string;
  value: string;
};

export type PayfastConfig = {
  merchantId: string;
  merchantKey: string;
  passphrase: string | null;
  mode: PayfastMode;
};

export const PAYFAST_VALID_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
] as const;

const PAYFAST_SOURCE_RANGES: ReadonlyArray<{ base: string; bits: number }> = [
  { base: "197.97.145.144", bits: 28 },
  { base: "41.74.179.192", bits: 27 },
  { base: "102.216.36.0", bits: 28 },
  { base: "102.216.36.128", bits: 28 },
  { base: "144.126.193.139", bits: 32 },
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function payfastModeFromEnv(raw: string | undefined): PayfastMode {
  return raw?.trim().toLowerCase() === "live" ? "live" : "sandbox";
}

export function readPayfastConfig(
  env: NodeJS.ProcessEnv = process.env,
): PayfastConfig | null {
  const merchantId = env.PAYFAST_MERCHANT_ID?.trim() ?? "";
  const merchantKey = env.PAYFAST_MERCHANT_KEY?.trim() ?? "";
  if (!merchantId || !merchantKey) return null;

  const passphrase = env.PAYFAST_PASSPHRASE?.trim() || null;
  return {
    merchantId,
    merchantKey,
    passphrase,
    mode: payfastModeFromEnv(env.PAYFAST_MODE),
  };
}

export function isPayfastConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return readPayfastConfig(env) !== null;
}

export function payfastProcessUrl(mode: PayfastMode): string {
  const host = mode === "live" ? "www.payfast.co.za" : "sandbox.payfast.co.za";
  return `https://${host}/eng/process`;
}

export function payfastValidateUrl(mode: PayfastMode): string {
  const host = mode === "live" ? "www.payfast.co.za" : "sandbox.payfast.co.za";
  return `https://${host}/eng/query/validate`;
}

export function payfastUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/%20/g, "+");
}

export function checkoutParamString(fields: readonly PayfastField[]): string {
  return fields
    .filter((field) => field.name !== "signature" && field.value.trim() !== "")
    .map((field) => `${field.name}=${payfastUrlEncode(field.value.trim())}`)
    .join("&");
}

export function itnParamString(fields: readonly PayfastField[]): string {
  return fields
    .filter((field) => field.name !== "signature")
    .map((field) => `${field.name}=${payfastUrlEncode(field.value)}`)
    .join("&");
}

export function withPassphrase(
  paramString: string,
  passphrase: string | null,
): string {
  const salt = passphrase?.trim() ?? "";
  if (!salt) return paramString;
  return `${paramString}&passphrase=${payfastUrlEncode(salt)}`;
}

export function md5Hex(value: string): string {
  return createHash("md5").update(value, "utf8").digest("hex");
}

export function generatePayfastSignature(
  fields: readonly PayfastField[],
  passphrase: string | null,
): string {
  return md5Hex(withPassphrase(checkoutParamString(fields), passphrase));
}

function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left.trim().toLowerCase());
  const b = Buffer.from(right.trim().toLowerCase());
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export function itnSignatureIsValid(
  fields: readonly PayfastField[],
  passphrase: string | null,
): boolean {
  const received = fields.find((field) => field.name === "signature")?.value;
  if (!received) return false;
  const expected = md5Hex(withPassphrase(itnParamString(fields), passphrase));
  return safeEqualHex(received, expected);
}

function normaliseIp(ip: string): string | null {
  let value = ip.trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith("::ffff:")) value = value.slice("::ffff:".length);
  return value;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value << 8) + octet;
  }
  return value >>> 0;
}

function inCidr(ip: string, base: string, bits: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isPayfastSourceIp(
  ip: string,
  validHostIps: readonly string[],
): boolean {
  const normalised = normaliseIp(ip);
  if (!normalised) return false;
  if (validHostIps.some((candidate) => normaliseIp(candidate) === normalised)) {
    return true;
  }
  return PAYFAST_SOURCE_RANGES.some((range) =>
    inCidr(normalised, range.base, range.bits),
  );
}

export function isPayfastSource(
  remoteAddresses: readonly string[],
  validHostIps: readonly string[],
): boolean {
  return remoteAddresses.some((ip) => isPayfastSourceIp(ip, validHostIps));
}

export function payfastCandidateIps(headers: {
  realIp: string | null;
  forwardedFor: string | null;
}): string[] {
  const ips: string[] = [];
  const realIp = headers.realIp?.trim();
  if (realIp) ips.push(realIp);
  if (headers.forwardedFor) {
    for (const part of headers.forwardedFor.split(",")) {
      const ip = part.trim();
      if (ip) ips.push(ip);
    }
  }
  return ips;
}

export async function resolvePayfastHostIps(
  resolveHost: (host: string) => Promise<string[]> = resolve4,
): Promise<string[]> {
  const results = await Promise.all(
    PAYFAST_VALID_HOSTS.map(async (host) => {
      try {
        return await resolveHost(host);
      } catch {
        return [];
      }
    }),
  );
  return [...new Set(results.flat())];
}

export function payfastAmountMatches(expected: number, gross: string): boolean {
  const received = Number(String(gross).trim());
  if (!Number.isFinite(expected) || !Number.isFinite(received)) return false;
  const expectedCents = Math.round(expected * 100);
  const receivedCents = Math.round(received * 100);
  return Math.abs(expectedCents - receivedCents) <= 1;
}

export function invoiceCanBePaidOnline(input: {
  type: string;
  status: string;
  balance: number;
}): boolean {
  return (
    input.type === "invoice" &&
    input.status !== "void" &&
    roundMoney(input.balance) > 0
  );
}

function fieldValue(
  fields: readonly PayfastField[],
  name: string,
): string | undefined {
  return fields.find((field) => field.name === name)?.value;
}

export function itnDocumentId(
  fields: readonly PayfastField[],
): { ok: true; documentId: string } | { ok: false; reason: string } {
  const paymentId = fieldValue(fields, "m_payment_id")?.trim() ?? "";
  if (!UUID_RE.test(paymentId)) {
    return { ok: false, reason: "missing invoice reference" };
  }
  const custom = fieldValue(fields, "custom_str1");
  if (custom !== undefined && custom.trim() !== "" && custom.trim() !== paymentId) {
    return { ok: false, reason: "invoice reference does not match" };
  }
  return { ok: true, documentId: paymentId };
}

export type PayfastItnLookup = {
  payable: boolean;
  expectedAmount: number;
  alreadyRecorded: boolean;
};

export type PayfastItnDecision =
  | { action: "reject"; reason: string }
  | { action: "acknowledge"; reason: "already_recorded" | "not_complete" }
  | { action: "lookup"; documentId: string }
  | {
      action: "confirm";
      paramString: string;
      pfPaymentId: string;
      amount: number;
      documentId: string;
    }
  | {
      action: "record";
      pfPaymentId: string;
      amount: number;
      documentId: string;
    };

export function evaluatePayfastItn(input: {
  fields: readonly PayfastField[];
  passphrase: string | null;
  merchantId: string;
  remoteAddresses: readonly string[];
  validHostIps: readonly string[];
  lookup?: PayfastItnLookup;
  serverConfirmed: boolean | null;
}): PayfastItnDecision {
  if (!itnSignatureIsValid(input.fields, input.passphrase)) {
    return { action: "reject", reason: "invalid signature" };
  }
  if (!isPayfastSource(input.remoteAddresses, input.validHostIps)) {
    return { action: "reject", reason: "untrusted source" };
  }

  const merchantId = fieldValue(input.fields, "merchant_id")?.trim() ?? "";
  if (!merchantId || merchantId !== input.merchantId) {
    return { action: "reject", reason: "merchant does not match" };
  }

  const document = itnDocumentId(input.fields);
  if (!document.ok) return { action: "reject", reason: document.reason };

  const paymentStatus = fieldValue(input.fields, "payment_status")?.trim() ?? "";
  if (!paymentStatus) {
    return { action: "reject", reason: "missing payment status" };
  }
  if (paymentStatus !== "COMPLETE") {
    return { action: "acknowledge", reason: "not_complete" };
  }

  const pfPaymentId = fieldValue(input.fields, "pf_payment_id")?.trim() ?? "";
  if (!pfPaymentId) {
    return { action: "reject", reason: "missing PayFast payment id" };
  }

  const gross = fieldValue(input.fields, "amount_gross");
  if (gross === undefined || gross.trim() === "") {
    return { action: "reject", reason: "missing amount" };
  }
  const amount = roundMoney(Number(gross));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { action: "reject", reason: "invalid amount" };
  }

  if (!input.lookup) {
    return { action: "lookup", documentId: document.documentId };
  }
  if (input.lookup.alreadyRecorded) {
    return { action: "acknowledge", reason: "already_recorded" };
  }
  if (!input.lookup.payable) {
    return { action: "reject", reason: "invoice cannot be paid" };
  }
  if (!payfastAmountMatches(input.lookup.expectedAmount, gross)) {
    return { action: "reject", reason: "amount does not match the amount due" };
  }

  if (input.serverConfirmed === null) {
    return {
      action: "confirm",
      paramString: itnParamString(input.fields),
      pfPaymentId,
      amount,
      documentId: document.documentId,
    };
  }
  if (!input.serverConfirmed) {
    return { action: "reject", reason: "PayFast did not confirm the payment" };
  }

  return {
    action: "record",
    pfPaymentId,
    amount,
    documentId: document.documentId,
  };
}

function pushText(
  fields: PayfastField[],
  name: string,
  value: string | undefined,
  max: number,
) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return;
  fields.push({ name, value: trimmed.slice(0, max) });
}

export function buildPayfastCheckout(input: {
  merchantId: string;
  merchantKey: string;
  passphrase: string | null;
  mode: PayfastMode;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  documentId: string;
  amount: number;
  itemName: string;
  buyerFirstName?: string;
  buyerLastName?: string;
  buyerEmail?: string;
}): { action: string; fields: PayfastField[] } {
  const itemName = input.itemName.trim().slice(0, 100) || "Invoice";
  const email = input.buyerEmail?.trim() ?? "";
  const fields: PayfastField[] = [
    { name: "merchant_id", value: input.merchantId },
    { name: "merchant_key", value: input.merchantKey },
    { name: "return_url", value: input.returnUrl },
    { name: "cancel_url", value: input.cancelUrl },
    { name: "notify_url", value: input.notifyUrl },
  ];
  pushText(fields, "name_first", input.buyerFirstName, 100);
  pushText(fields, "name_last", input.buyerLastName, 100);
  if (email && email.length <= 100 && email.includes("@") && !/\s/.test(email)) {
    fields.push({ name: "email_address", value: email });
  }
  fields.push(
    { name: "m_payment_id", value: input.documentId },
    { name: "amount", value: roundMoney(input.amount).toFixed(2) },
    { name: "item_name", value: itemName },
    { name: "custom_str1", value: input.documentId },
  );
  fields.push({
    name: "signature",
    value: generatePayfastSignature(fields, input.passphrase),
  });
  return { action: payfastProcessUrl(input.mode), fields };
}

export function splitPersonName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export async function confirmItnWithPayfast(
  paramString: string,
  mode: PayfastMode,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetchImpl(payfastValidateUrl(mode), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: paramString,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return false;
  const text = (await response.text()).trim();
  return text === "VALID";
}

export function fieldsFromFormData(formData: FormData): PayfastField[] {
  const fields: PayfastField[] = [];
  for (const [name, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    fields.push({ name, value });
  }
  return fields;
}
