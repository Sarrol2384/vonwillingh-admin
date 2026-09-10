import { calcDocumentTotals, todayIsoDate } from "@/lib/money";
import type { BillingCadence } from "@/lib/supabase/types";

export function addBillingPeriod(
  isoDate: string,
  cadence: BillingCadence,
): string {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));

  const months =
    cadence === "monthly" ? 1 : cadence === "quarterly" ? 3 : 12;

  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDay);

  return [
    String(targetYear),
    String(normalizedMonth + 1).padStart(2, "0"),
    String(clampedDay).padStart(2, "0"),
  ].join("-");
}

export function addDaysIso(isoDate: string, days: number): string {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const date = new Date(
    Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)),
  );
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dueDateFromTerms(
  issueDate: string,
  paymentTermsDays: number | null | undefined,
): string {
  const days =
    typeof paymentTermsDays === "number" && paymentTermsDays >= 0
      ? paymentTermsDays
      : 14;
  return addDaysIso(issueDate, days);
}

export function newPublicToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function contractPeriodLabel(
  billOn: string,
  cadence: BillingCadence,
): string {
  const endExclusive = addBillingPeriod(billOn, cadence);
  const endInclusive = addDaysIso(endExclusive, -1);
  return `${billOn} to ${endInclusive}`;
}

export function invoiceNotesForContract(args: {
  title: string;
  billOn: string;
  cadence: BillingCadence;
  existingNotes?: string;
}): string {
  const period = contractPeriodLabel(args.billOn, args.cadence);
  const header = `Contract: ${args.title}\nBilling period: ${period}`;
  const extra = args.existingNotes?.trim();
  return extra ? `${header}\n\n${extra}` : header;
}

export function totalsFromLines(
  lines: Array<{ qty: number; unit_price: number }>,
) {
  return calcDocumentTotals(
    lines.map((line) => ({
      qty: Number(line.qty) || 0,
      unit_price: Number(line.unit_price) || 0,
      vat_rate: 0,
    })),
  );
}

export function defaultNextBillOn(startDate: string): string {
  return startDate || todayIsoDate();
}
