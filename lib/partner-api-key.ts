import { createHash, randomBytes } from "node:crypto";

export const PARTNER_KEY_PREFIX = "odelhub_live_";

export const PARTNER_SCOPES = [
  "payments:read",
  "payments:create",
  "students:read",
  "organizations:read",
  "dex:quote:read",
  "dex:intent:create",
  "dex:intent:write",
  "opgb:balance:read",
  "charges:create",
  "charges:read",
  "payouts:create",
  "payouts:read",
  "ads:read",
  "ads:write",
] as const;

export type PartnerScope = (typeof PARTNER_SCOPES)[number];

export function hashPartnerApiKey(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function generatePartnerApiKey(): { plain: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const plain = `${PARTNER_KEY_PREFIX}${secret}`;
  const prefix = plain.slice(0, PARTNER_KEY_PREFIX.length + 8);
  return { plain, prefix, hash: hashPartnerApiKey(plain) };
}

export function extractPartnerApiKeyFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token.startsWith(PARTNER_KEY_PREFIX)) return token;
  }
  const header = req.headers.get("x-api-key")?.trim();
  if (header?.startsWith(PARTNER_KEY_PREFIX)) return header;
  return null;
}

export function partnerKeyHasScope(scopes: string[], required: PartnerScope): boolean {
  return scopes.includes(required);
}
