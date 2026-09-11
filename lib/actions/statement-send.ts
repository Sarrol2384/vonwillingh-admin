"use server";

import { requireUser } from "@/lib/auth";
import { sendBrevoEmail } from "@/lib/email/brevo";
import { buildStatementEmail } from "@/lib/email/statement-email";
import {
  loadClientStatement,
  parseStatementRange,
} from "@/lib/statements";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function sendClientStatementEmail(args: {
  clientId: string;
  from: string;
  to: string;
}): Promise<ActionResult> {
  const range = parseStatementRange(args.from, args.to);
  if ("error" in range) {
    return { ok: false, error: range.error };
  }

  const { supabase } = await requireUser();
  const statement = await loadClientStatement(
    supabase,
    args.clientId,
    range.from,
    range.to,
  );
  if ("error" in statement) {
    return { ok: false, error: statement.error };
  }

  const toEmail = statement.client.email?.trim();
  if (!toEmail) {
    return { ok: false, error: "Client has no email address" };
  }

  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!settings) {
    return { ok: false, error: "Company settings not found" };
  }

  const email = buildStatementEmail({ statement, settings });
  const result = await sendBrevoEmail(
    {
      toEmail,
      toName:
        statement.client.business_name?.trim() || statement.client.name,
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent,
      replyTo: {
        email: settings.email,
        name: settings.contact_name,
      },
    },
    { email: settings.email, name: settings.company_name },
  );

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
