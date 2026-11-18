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
  if (!base || !token) return null;
  return `${base}/invoice/${token}`;
}
