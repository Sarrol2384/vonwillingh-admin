import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicPayPanel({
  token,
  balanceLabel,
  showPay,
  showDue,
  settled,
  notice,
}: {
  token: string;
  balanceLabel: string;
  showPay: boolean;
  showDue: boolean;
  settled: boolean;
  notice: "received" | "cancelled" | null;
}) {
  if (!notice && !settled && !showDue) return null;

  return (
    <div className="no-print mb-6 space-y-3">
      {notice === "received" ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm font-medium">
          Thanks, payment received.
        </p>
      ) : null}
      {notice === "cancelled" ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm font-medium">
          Payment cancelled.
        </p>
      ) : null}
      {settled ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm font-medium">
          This invoice is paid.
        </p>
      ) : null}
      {showDue ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3">
          <div>
            <p className="font-medium">Amount due {balanceLabel}</p>
            <p className="text-sm text-neutral-600">
              {showPay
                ? "Pay by card or Instant EFT."
                : "Use the bank details on this invoice."}
            </p>
          </div>
          {showPay ? (
            <form action={`/invoice/${encodeURIComponent(token)}/pay`} method="post">
              <button
                type="submit"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Pay now
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
