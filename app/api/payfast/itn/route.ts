import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  confirmItnWithPayfast,
  evaluatePayfastItn,
  fieldsFromFormData,
  invoiceCanBePaidOnline,
  payfastCandidateIps,
  readPayfastConfig,
  resolvePayfastHostIps,
  type PayfastItnDecision,
  type PayfastItnLookup,
} from "@/lib/payfast";
import { recordPayfastPayment } from "@/lib/payfast-record";
import { invoiceBalance } from "@/lib/payments";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function respond(decision: PayfastItnDecision) {
  if (decision.action === "reject") {
    console.error(`PayFast ITN rejected: ${decision.reason}`);
    return text(decision.reason, 400);
  }
  return text("OK", 200);
}

export async function POST(request: Request) {
  const config = readPayfastConfig();
  if (!config) return text("PayFast is not configured", 500);

  // The notify URL may include a query string, such as Vercel's
  // protection bypass. Validation uses the posted fields only.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return text("invalid notification", 400);
  }

  const fields = fieldsFromFormData(formData);
  const remoteAddresses = payfastCandidateIps({
    realIp: request.headers.get("x-real-ip"),
    forwardedFor: request.headers.get("x-forwarded-for"),
  });
  const validHostIps = await resolvePayfastHostIps();

  let decision = evaluatePayfastItn({
    fields,
    passphrase: config.passphrase,
    merchantId: config.merchantId,
    remoteAddresses,
    validHostIps,
    serverConfirmed: null,
  });

  if (decision.action !== "lookup") return respond(decision);

  let supabase;
  try {
    supabase = createSupabaseServiceRoleClient();
  } catch (error) {
    console.error(error);
    return text("payment recording is not configured", 500);
  }

  const documentId = decision.documentId;
  const pfPaymentId =
    fields.find((field) => field.name === "pf_payment_id")?.value.trim() ?? "";

  const [
    { data: invoice, error: invoiceError },
    { data: payments, error: paymentsError },
    { data: existing, error: existingError },
  ] = await Promise.all([
      supabase
        .from("documents")
        .select("id, client_id, type, status, total, public_token")
        .eq("id", documentId)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("amount, document_id")
        .eq("document_id", documentId),
      supabase
        .from("payments")
        .select("id")
        .eq("pf_payment_id", pfPaymentId)
        .maybeSingle(),
    ]);

  if (invoiceError || paymentsError || existingError) {
    console.error(
      invoiceError?.message ?? paymentsError?.message ?? existingError?.message,
    );
    return text("could not check the invoice", 500);
  }

  const balance = invoice ? invoiceBalance(invoice, payments ?? []) : 0;
  const lookup: PayfastItnLookup = {
    payable: invoice
      ? invoiceCanBePaidOnline({ ...invoice, balance })
      : false,
    expectedAmount: balance,
    alreadyRecorded: Boolean(existing),
  };

  decision = evaluatePayfastItn({
    fields,
    passphrase: config.passphrase,
    merchantId: config.merchantId,
    remoteAddresses,
    validHostIps,
    lookup,
    serverConfirmed: null,
  });

  if (decision.action === "confirm") {
    let serverConfirmed = false;
    try {
      serverConfirmed = await confirmItnWithPayfast(
        decision.paramString,
        config.mode,
      );
    } catch (error) {
      console.error(error);
      return text("could not confirm with PayFast", 500);
    }
    decision = evaluatePayfastItn({
      fields,
      passphrase: config.passphrase,
      merchantId: config.merchantId,
      remoteAddresses,
      validHostIps,
      lookup,
      serverConfirmed,
    });
  }

  if (decision.action !== "record") return respond(decision);
  if (!invoice) return text("invoice cannot be paid", 400);

  const recorded = await recordPayfastPayment(supabase, {
    clientId: invoice.client_id,
    documentId: invoice.id,
    amount: decision.amount,
    pfPaymentId: decision.pfPaymentId,
  });

  if (!recorded.ok) {
    console.error(recorded.error);
    return text("could not record the payment", 500);
  }

  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath(`/documents/${invoice.id}`);
  revalidatePath(`/clients/${invoice.client_id}`);
  if (invoice.public_token) {
    revalidatePath(`/invoice/${invoice.public_token}`);
  }

  return text("OK", 200);
}
