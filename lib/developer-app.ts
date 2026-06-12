import { createHash, randomBytes } from "node:crypto";

export const DEVELOPER_CLIENT_ID_PREFIX = "odelhub_app_";
export const DEVELOPER_DEFAULT_SCOPES = [
  "dex:quote:read",
  "dex:intent:create",
  "opgb:balance:read",
  "payments:read",
  "organizations:read",
] as const;

export const PARTNER_WEBHOOK_EVENTS = [
  "payment.confirmed",
  "payment.failed",
  "dex.intent.created",
  "dex.intent.completed",
] as const;

export type PartnerWebhookEvent = (typeof PARTNER_WEBHOOK_EVENTS)[number];

export function hashDeveloperClientSecret(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function generateDeveloperCredentials(): {
  clientId: string;
  clientSecret: string;
  clientSecretHash: string;
} {
  const idSuffix = randomBytes(12).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  const clientId = `${DEVELOPER_CLIENT_ID_PREFIX}${idSuffix}`;
  const clientSecret = `${clientId}.${secret}`;
  return { clientId, clientSecret, clientSecretHash: hashDeveloperClientSecret(clientSecret) };
}

export function slugifyDeveloperAppName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const suffix = randomBytes(3).toString("hex");
  return `${base || "app"}-${suffix}`;
}

export function isValidRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" || (u.protocol === "http:" && u.hostname === "localhost");
  } catch {
    return false;
  }
}

export function developerAppPublicView(app: {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  clientId: string;
  redirectUris: string[];
  brandingName: string;
  brandingLogoUrl: string;
  scopes: string[];
  enabled: boolean;
  organizationId: string | null;
  createdAt: Date;
}) {
  return {
    id: app.id,
    name: app.name,
    slug: app.slug,
    contactEmail: app.contactEmail,
    clientId: app.clientId,
    redirectUris: app.redirectUris,
    brandingName: app.brandingName || app.name,
    brandingLogoUrl: app.brandingLogoUrl,
    scopes: app.scopes,
    enabled: app.enabled,
    organizationId: app.organizationId,
    createdAt: app.createdAt.toISOString(),
  };
}
