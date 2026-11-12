const RECIPIENT_SPLIT = /[,;]+/;

export function parseRecipientEmails(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const part of value.split(RECIPIENT_SPLIT)) {
    const email = part.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push(email);
  }
  return recipients;
}

export function sameRecipients(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const a = left.map((email) => email.toLowerCase()).sort();
  const b = right.map((email) => email.toLowerCase()).sort();
  return a.every((email, index) => email === b[index]);
}

export function formatRecipientList(recipients: string[]): string {
  if (recipients.length <= 1) return recipients[0] ?? "";
  if (recipients.length === 2) {
    return `${recipients[0]} and ${recipients[1]}`;
  }
  return `${recipients.slice(0, -1).join(", ")}, and ${recipients[recipients.length - 1]}`;
}

export function describeInvoiceSend(args: {
  number: string;
  amount: string;
  recipients: string[];
}): string {
  const to = formatRecipientList(args.recipients);
  if (!to) return `Send invoice ${args.number} for ${args.amount}`;
  return `Send invoice ${args.number} for ${args.amount} to ${to}`;
}

export function describeInvoiceSent(args: {
  number: string;
  amount: string;
  recipients: string[];
  when: string;
}): string {
  const to = formatRecipientList(args.recipients);
  if (!to) {
    return `Sent invoice ${args.number} for ${args.amount} on ${args.when}`;
  }
  return `Sent invoice ${args.number} for ${args.amount} to ${to} on ${args.when}`;
}
