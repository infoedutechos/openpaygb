/** Base URL for links (QR, Telegram, TON Connect manifest). Prefer NEXT_PUBLIC_APP_URL on Vercel. */
export function getPublicOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "";
}

export function absoluteUrl(path: string): string {
  const origin = getPublicOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!origin) return p;
  return `${origin}${p}`;
}
