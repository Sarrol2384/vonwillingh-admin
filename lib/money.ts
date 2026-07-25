export const DEFAULT_VAT_RATE = 0;

export function formatZar(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "R 0.00";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date.includes("T") ? date : `${date}T12:00:00`));
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type LineInput = {
  qty: number;
  unit_price: number;
  vat_rate: number;
};

export type LineTotals = {
  line_excl: number;
  line_vat: number;
  line_incl: number;
};

export function calcLineTotals(line: LineInput): LineTotals {
  const qty = Number(line.qty) || 0;
  const unit = Number(line.unit_price) || 0;
  const rate = Number(line.vat_rate) || 0;
  const line_excl = round2(qty * unit);
  const line_vat = round2(line_excl * (rate / 100));
  const line_incl = round2(line_excl + line_vat);
  return { line_excl, line_vat, line_incl };
}

export function calcDocumentTotals(lines: LineInput[]) {
  let subtotal = 0;
  let vat_total = 0;
  for (const line of lines) {
    const t = calcLineTotals(line);
    subtotal = round2(subtotal + t.line_excl);
    vat_total = round2(vat_total + t.line_vat);
  }
  return {
    subtotal,
    vat_total,
    total: round2(subtotal + vat_total),
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Line amounts are excl. VAT — matches editor, print, and Word export. */
export function totalFromDocumentLines(
  lines: { qty: number | string; unit_price: number | string; vat_rate?: number | string }[],
) {
  return calcDocumentTotals(
    lines.map((line) => ({
      qty: Number(line.qty) || 0,
      unit_price: Number(line.unit_price) || 0,
      vat_rate: 0,
    })),
  ).total;
}
