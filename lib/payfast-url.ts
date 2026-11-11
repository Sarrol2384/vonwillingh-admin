const FORWARDED_PAY_PARAMS = [
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
] as const;

/**
 * POST target for Pay now. A protected Vercel preview only lets the first
 * submission through when the bypass query from the invoice URL is included.
 */
export function payNowPostPath(token: string, search: string): string {
  const path = `/invoice/${encodeURIComponent(token)}/pay`;
  const incoming = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const forwarded = new URLSearchParams();
  for (const name of FORWARDED_PAY_PARAMS) {
    const value = incoming.get(name);
    if (value) forwarded.set(name, value);
  }
  const query = forwarded.toString();
  return query ? `${path}?${query}` : path;
}
