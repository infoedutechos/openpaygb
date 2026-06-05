/**
 * Edge-safe URA `admin_session` cookie verification (Web Crypto).
 * Middleware must not import `utils/admin-session.ts` (Node `crypto`).
 */

const PAYLOAD_SEP = ".";

function sessionSecret(): string {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify legacy URA shell `admin_session` cookie (same format as `utils/admin-session.ts`). */
export async function verifyAdminSessionTokenEdge(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const secret = sessionSecret();
  if (!secret) return false;

  const parts = value.split(PAYLOAD_SEP);
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (Number.isNaN(exp) || exp <= 0) return false;
  if (Date.now() / 1000 > exp) return false;

  const payload = `${expStr}${PAYLOAD_SEP}admin`;
  const expected = await hmacSha256Base64Url(secret, payload);
  return timingSafeEqualString(sig, expected);
}
