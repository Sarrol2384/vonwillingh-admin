import "server-only";

export type BrevoSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export type BrevoEmailPayload = {
  toEmail: string;
  toName?: string;
  /** Every address this message is delivered to. Falls back to `toEmail`. */
  toEmails?: string[];
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: { email: string; name?: string };
};

function deliveryAddresses(payload: BrevoEmailPayload): string[] {
  const source = payload.toEmails?.length ? payload.toEmails : [payload.toEmail];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const raw of source) {
    const email = raw.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return emails;
}

function senderFromEnv(): { email: string; name: string } | null {
  const email = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!email) return null;
  return {
    email,
    name: process.env.BREVO_SENDER_NAME?.trim() || "VonWillingh Online",
  };
}

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim() && senderFromEnv());
}

export async function sendBrevoEmail(
  payload: BrevoEmailPayload,
  fallbackSender?: { email: string; name: string },
): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "BREVO_API_KEY is not configured" };
  }

  const sender = senderFromEnv() ?? fallbackSender;
  if (!sender?.email) {
    return {
      ok: false,
      error: "BREVO_SENDER_EMAIL is not configured",
    };
  }

  const emails = deliveryAddresses(payload);
  if (!emails.length) {
    return { ok: false, error: "No recipient email address" };
  }

  const body = {
    sender: { email: sender.email, name: sender.name },
    to: emails.map((email, index) => ({
      email,
      ...(index === 0 && payload.toName ? { name: payload.toName } : {}),
    })),
    subject: payload.subject,
    htmlContent: payload.htmlContent,
    textContent: payload.textContent,
    ...(payload.replyTo?.email
      ? {
          replyTo: {
            email: payload.replyTo.email,
            ...(payload.replyTo.name ? { name: payload.replyTo.name } : {}),
          },
        }
      : {}),
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => null)) as {
      messageId?: string;
      message?: string;
      code?: string;
    } | null;

    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.message ||
          `Brevo request failed (${response.status})`,
      };
    }

    return { ok: true, messageId: data?.messageId ?? "" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Brevo send failed",
    };
  }
}
