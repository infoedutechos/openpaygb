import { validateOrgFaviconBuffer } from "@/lib/validate-org-favicon";

const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 12_000;

function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ODELHUB-Pay/1.0 (+favicon-fetch)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Try common favicon locations for a school website. */
export async function fetchFaviconFromWebsite(websiteUrl: string): Promise<Buffer | null> {
  const origin = normalizeWebsiteUrl(websiteUrl);
  if (!origin) return null;

  const candidates = [
    `${origin}/favicon.ico`,
    `${origin}/favicon.png`,
    `${origin}/apple-touch-icon.png`,
  ];

  for (const url of candidates) {
    const buf = await fetchBuffer(url);
    if (!buf) continue;
    const valid = validateOrgFaviconBuffer(buf);
    if (valid.ok) return buf;
  }
  return null;
}
