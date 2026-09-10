import "server-only";

import { formatDate, formatZar } from "@/lib/money";
import { hasBankDetails } from "@/lib/company";
import type { Client, CompanySettings, Document, DocumentLine } from "@/lib/supabase/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildInvoiceEmail(args: {
  document: Document;
  lines: DocumentLine[];
  client: Client;
  settings: CompanySettings;
  viewUrl?: string | null;
}): { subject: string; htmlContent: string; textContent: string } {
  const { document, lines, client, settings, viewUrl } = args;
  const clientLabel = client.business_name?.trim() || client.name;
  const subject = `Invoice ${document.number} from ${settings.company_name}`;

  const sortedLines = [...lines].sort((a, b) => a.sort_order - b.sort_order);
  const lineRowsHtml = sortedLines
    .map((line) => {
      const amount = Number(line.qty) * Number(line.unit_price);
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5">${escapeHtml(line.description)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right">${Number(line.qty)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right">${escapeHtml(formatZar(Number(line.unit_price)))}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right">${escapeHtml(formatZar(amount))}</td>
      </tr>`;
    })
    .join("");

  const bankHtml = hasBankDetails(settings)
    ? `<p style="margin:16px 0 0"><strong>Bank details</strong><br/>
        ${escapeHtml(settings.bank_name)}<br/>
        Account name: ${escapeHtml(settings.bank_account_name)}<br/>
        Account number: ${escapeHtml(settings.bank_account_number)}<br/>
        Branch code: ${escapeHtml(settings.bank_branch_code)}
      </p>
      <p style="margin:8px 0 0">Please use invoice number <strong>${escapeHtml(document.number)}</strong> as your payment reference.</p>`
    : "";

  const viewHtml = viewUrl
    ? `<p style="margin:20px 0"><a href="${escapeHtml(viewUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">View invoice online</a></p>`
    : "";

  const htmlContent = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#111;line-height:1.5">
  <p>Dear ${escapeHtml(clientLabel)},</p>
  <p>Please find invoice <strong>${escapeHtml(document.number)}</strong> for <strong>${escapeHtml(formatZar(Number(document.total)))}</strong>.</p>
  <p>
    Issue date: ${escapeHtml(formatDate(document.issue_date))}<br/>
    ${document.due_or_valid_until ? `Due date: ${escapeHtml(formatDate(document.due_or_valid_until))}<br/>` : ""}
  </p>
  <table style="width:100%;border-collapse:collapse;margin-top:12px">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px;border-bottom:2px solid #111">Description</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Qty</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Unit</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Amount</th>
      </tr>
    </thead>
    <tbody>${lineRowsHtml}</tbody>
  </table>
  <p style="text-align:right;margin-top:12px"><strong>Total: ${escapeHtml(formatZar(Number(document.total)))}</strong></p>
  ${bankHtml}
  ${viewHtml}
  ${document.notes?.trim() ? `<p style="margin-top:16px;white-space:pre-wrap">${escapeHtml(document.notes)}</p>` : ""}
  <p style="margin-top:24px">Kind regards,<br/>${escapeHtml(settings.contact_name)}<br/>${escapeHtml(settings.company_name)}<br/>${escapeHtml(settings.email)}</p>
</body>
</html>`;

  const textLines = sortedLines
    .map((line) => {
      const amount = Number(line.qty) * Number(line.unit_price);
      return `- ${line.description} × ${Number(line.qty)} @ ${formatZar(Number(line.unit_price))} = ${formatZar(amount)}`;
    })
    .join("\n");

  const bankText = hasBankDetails(settings)
    ? `\nBank details:\n${settings.bank_name}\nAccount name: ${settings.bank_account_name}\nAccount number: ${settings.bank_account_number}\nBranch code: ${settings.bank_branch_code}\nPlease use ${document.number} as your payment reference.\n`
    : "";

  const textContent = `Dear ${clientLabel},

Please find invoice ${document.number} for ${formatZar(Number(document.total))}.

Issue date: ${formatDate(document.issue_date)}
${document.due_or_valid_until ? `Due date: ${formatDate(document.due_or_valid_until)}\n` : ""}
${textLines}

Total: ${formatZar(Number(document.total))}
${bankText}
${viewUrl ? `View invoice: ${viewUrl}\n` : ""}
${document.notes?.trim() ? `\n${document.notes}\n` : ""}
Kind regards,
${settings.contact_name}
${settings.company_name}
${settings.email}
`;

  return { subject, htmlContent, textContent };
}

export function appBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "";
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function publicInvoiceUrl(token: string): string | null {
  const base = appBaseUrl();
  if (!base) return null;
  return `${base}/invoice/${token}`;
}
