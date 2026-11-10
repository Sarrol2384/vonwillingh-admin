export const DOCUMENT_TYPE_LABELS = {
  quote: "Quote",
  invoice: "Invoice",
  credit_note: "Credit Note",
} as const;

export const DOCUMENT_STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  paid: "Paid",
  issued: "Issued",
  void: "Void",
} as const;

export function statusesForType(type: "quote" | "invoice" | "credit_note") {
  switch (type) {
    case "quote":
      return ["draft", "sent", "accepted", "declined", "void"] as const;
    case "invoice":
      return ["draft", "sent", "paid", "void"] as const;
    case "credit_note":
      return ["draft", "issued", "void"] as const;
  }
}

export function documentTypeFromParam(
  value: string | null | undefined,
): "quote" | "invoice" | "credit_note" | null {
  if (value === "quote" || value === "invoice" || value === "credit_note") {
    return value;
  }
  return null;
}

/**
 * Notes printed or emailed to a customer. The business is not VAT registered,
 * so prices are the full amount and VAT wording must not appear.
 * Known seed sentences are rewritten in place; any leftover line that still
 * mentions VAT is dropped so older saved quotes stay clean.
 */
export function customerFacingNotes(notes: string | null | undefined): string {
  if (!notes?.trim()) return "";

  const cleaned = notes
    .replace(/prices exclusive of vat unless otherwise stated\.?\s*/gi, "")
    .replace(/\s+ex vat where marked/gi, "");

  return cleaned
    .split("\n")
    .filter((line) => !/\bvat\b/i.test(line))
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
