import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/email/invoice-email";
import { formatZar } from "@/lib/money";
import {
  buildPayfastCheckout,
  invoiceCanBePaidOnline,
  readPayfastConfig,
  splitPersonName,
} from "@/lib/payfast";
import { invoiceBalance } from "@/lib/payments";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteBase(request: Request): string {
  return appBaseUrl() ?? new URL(request.url).origin;
}

function backToInvoice(request: Request, token: string) {
  return NextResponse.redirect(
    new URL(`/invoice/${encodeURIComponent(token)}`, request.url),
    303,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) return new NextResponse("Invoice not found", { status: 404 });
  return backToInvoice(request, token);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return new NextResponse("Invoice not found", { status: 404 });
  }

  const config = readPayfastConfig();
  if (!config) return backToInvoice(request, token);

  let supabase;
  try {
    supabase = createSupabaseServiceRoleClient();
  } catch (error) {
    console.error(error);
    return new NextResponse("Online payment is not available right now.", {
      status: 500,
    });
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, client_id, type, status, number, total, clients(name, email)")
    .eq("public_token", token)
    .maybeSingle();

  if (error || !document) {
    return new NextResponse("Invoice not found", { status: 404 });
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, document_id")
    .eq("document_id", document.id);

  if (paymentsError) {
    console.error(paymentsError.message);
    return new NextResponse("Online payment is not available right now.", {
      status: 500,
    });
  }

  const balance = invoiceBalance(document, payments ?? []);
  if (!invoiceCanBePaidOnline({ ...document, balance })) {
    return backToInvoice(request, token);
  }

  const client = document.clients;
  const name = splitPersonName(client?.name ?? "");
  const base = siteBase(request);
  const checkout = buildPayfastCheckout({
    merchantId: config.merchantId,
    merchantKey: config.merchantKey,
    passphrase: config.passphrase,
    mode: config.mode,
    returnUrl: `${base}/invoice/${encodeURIComponent(token)}?payment=received`,
    cancelUrl: `${base}/invoice/${encodeURIComponent(token)}?payment=cancelled`,
    notifyUrl: `${base}/api/payfast/itn`,
    documentId: document.id,
    amount: balance,
    itemName: document.number,
    buyerFirstName: name.first,
    buyerLastName: name.last,
    buyerEmail: client?.email,
  });

  const inputs = checkout.fields
    .map(
      (field) =>
        `<input type="hidden" name="${escapeHtml(field.name)}" value="${escapeHtml(field.value)}" />`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en-ZA">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pay ${escapeHtml(document.number)}</title>
</head>
<body style="font-family:Arial,sans-serif;margin:2rem;color:#172033">
  <p>Taking you to PayFast to pay ${escapeHtml(formatZar(balance))}.</p>
  <form id="payfast" action="${escapeHtml(checkout.action)}" method="post">
    ${inputs}
    <button type="submit">Continue to PayFast</button>
  </form>
  <script>document.getElementById("payfast").submit();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
