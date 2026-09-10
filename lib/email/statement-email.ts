import "server-only";

import { formatDate, formatZar } from "@/lib/money";
import { hasBankDetails } from "@/lib/company";
import type { ClientStatement } from "@/lib/statements";
import type { CompanySettings } from "@/lib/supabase/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildStatementEmail(args: {
  statement: ClientStatement;
  settings: CompanySettings;
}): { subject: string; htmlContent: string; textContent: string } {
  const { statement, settings } = args;
  const clientLabel =
    statement.client.business_name?.trim() || statement.client.name;
  const period = `${formatDate(statement.from)} – ${formatDate(statement.to)}`;
  const subject = `Account statement — ${clientLabel} (${period})`;

  const rowsHtml = statement.lines
    .map((line) => {
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5">${escapeHtml(formatDate(line.date))}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5">${escapeHtml(line.description)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right">${line.debit ? escapeHtml(formatZar(line.debit)) : ""}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right">${line.credit ? escapeHtml(formatZar(line.credit)) : ""}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right">${escapeHtml(formatZar(line.balance))}</td>
      </tr>`;
    })
    .join("");

  const bankHtml = hasBankDetails(settings)
    ? `<p style="margin:16px 0 0"><strong>Bank details</strong><br/>
        ${escapeHtml(settings.bank_name)}<br/>
        Account name: ${escapeHtml(settings.bank_account_name)}<br/>
        Account number: ${escapeHtml(settings.bank_account_number)}<br/>
        Branch code: ${escapeHtml(settings.bank_branch_code)}
      </p>`
    : "";

  const htmlContent = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#111;line-height:1.5">
  <p>Dear ${escapeHtml(clientLabel)},</p>
  <p>Please find your account statement for <strong>${escapeHtml(period)}</strong>.</p>
  <p><strong>Amount due: ${escapeHtml(formatZar(statement.closingBalance))}</strong></p>
  <table style="width:100%;border-collapse:collapse;margin-top:12px">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px;border-bottom:2px solid #111">Date</th>
        <th style="text-align:left;padding:8px;border-bottom:2px solid #111">Description</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Invoices</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Payments</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Balance</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <p style="margin-top:12px">
    Opening: ${escapeHtml(formatZar(statement.openingBalance))}<br/>
    Invoiced: ${escapeHtml(formatZar(statement.periodInvoiced))}<br/>
    Paid: ${escapeHtml(formatZar(statement.periodPaid))}<br/>
    <strong>Amount due: ${escapeHtml(formatZar(statement.closingBalance))}</strong>
  </p>
  ${bankHtml}
  <p style="margin-top:24px">Kind regards,<br/>${escapeHtml(settings.contact_name)}<br/>${escapeHtml(settings.company_name)}<br/>${escapeHtml(settings.email)}</p>
</body>
</html>`;

  const rowsText = statement.lines
    .map((line) => {
      const debit = line.debit ? formatZar(line.debit) : "-";
      const credit = line.credit ? formatZar(line.credit) : "-";
      return `${formatDate(line.date)} | ${line.description} | Dr ${debit} | Cr ${credit} | Bal ${formatZar(line.balance)}`;
    })
    .join("\n");

  const bankText = hasBankDetails(settings)
    ? `\nBank details:\n${settings.bank_name}\nAccount name: ${settings.bank_account_name}\nAccount number: ${settings.bank_account_number}\nBranch code: ${settings.bank_branch_code}\n`
    : "";

  const textContent = `Dear ${clientLabel},

Please find your account statement for ${period}.

Amount due: ${formatZar(statement.closingBalance)}

${rowsText}

Opening: ${formatZar(statement.openingBalance)}
Invoiced: ${formatZar(statement.periodInvoiced)}
Paid: ${formatZar(statement.periodPaid)}
Amount due: ${formatZar(statement.closingBalance)}
${bankText}
Kind regards,
${settings.contact_name}
${settings.company_name}
${settings.email}
`;

  return { subject, htmlContent, textContent };
}
