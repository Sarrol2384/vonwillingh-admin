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
