import "server-only";

import { BUILTIN_SOCIAL_KEYS, type BuiltinSocialKey } from "@/lib/site-ui-shared";
import {
  platformLogoContentType,
  validatePlatformLogoBuffer,
} from "@/lib/validate-platform-logo";

/** Max binary size per social icon (smaller than site logo). */
const MAX_SOCIAL_ICON_BYTES = 128 * 1024;

export const SOCIAL_ICON_PUBLIC_PREFIX = "/api/public/social-icon";

export type StoredSocialLinkIcon = {
  contentType: string;
  /** Base64-encoded image bytes */
  base64: string;
  uploadedAt: string;
};

export type SocialLinkIconsMap = Partial<Record<string, StoredSocialLinkIcon>>;

export function isBuiltinSocialKey(key: string): key is BuiltinSocialKey {
  return (BUILTIN_SOCIAL_KEYS as readonly string[]).includes(key);
}

export function parseSocialLinkIcons(raw: unknown): SocialLinkIconsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: SocialLinkIconsMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!isBuiltinSocialKey(key)) continue;
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const v = val as Record<string, unknown>;
    const base64 = typeof v.base64 === "string" ? v.base64.trim() : "";
    const contentType = typeof v.contentType === "string" ? v.contentType.trim() : "";
    const uploadedAt = typeof v.uploadedAt === "string" ? v.uploadedAt.trim() : "";
    if (!base64 || !contentType || !uploadedAt) continue;
    out[key] = { base64, contentType, uploadedAt };
  }
  return out;
}

export function socialLinkIconUrl(key: string, icon: StoredSocialLinkIcon | undefined): string | null {
  if (!icon?.uploadedAt) return null;
  const v = encodeURIComponent(icon.uploadedAt);
  return `${SOCIAL_ICON_PUBLIC_PREFIX}/${encodeURIComponent(key)}?v=${v}`;
}

export function validateSocialLinkIconBuffer(buf: Buffer): { ok: true } | { ok: false; reason: string } {
  if (buf.length > MAX_SOCIAL_ICON_BYTES) {
    return { ok: false, reason: `Icon must be ${MAX_SOCIAL_ICON_BYTES / 1024}KB or smaller.` };
  }
  return validatePlatformLogoBuffer(buf);
}

export function storedIconToBuffer(icon: StoredSocialLinkIcon): Buffer | null {
  try {
    const buf = Buffer.from(icon.base64, "base64");
    if (!buf.length) return null;
    return buf;
  } catch {
    return null;
  }
}

export function bufferToStoredIcon(buf: Buffer, contentType: string): StoredSocialLinkIcon {
  return {
    contentType,
    base64: buf.toString("base64"),
    uploadedAt: new Date().toISOString(),
  };
}

export function serializeSocialLinkIcons(map: SocialLinkIconsMap): Record<string, StoredSocialLinkIcon> {
  const out: Record<string, StoredSocialLinkIcon> = {};
  for (const key of BUILTIN_SOCIAL_KEYS) {
    const icon = map[key];
    if (icon) out[key] = icon;
  }
  return out;
}

export function iconContentTypeFromBuffer(buf: Buffer): string {
  return platformLogoContentType(buf);
}

/** Read stored per-platform icons; empty map if Prisma client is stale (dev server not restarted). */
export async function readSocialLinkIconsMap(): Promise<SocialLinkIconsMap> {
  const { prisma } = await import("@/lib/prisma");
  const { PLATFORM_SITE_UI_KEY, isUnknownSocialLinkIconsFieldError } = await import(
    "@/lib/site-ui-settings"
  );
  try {
    const row = await prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: { socialLinkIcons: true },
    });
    return parseSocialLinkIcons(row?.socialLinkIcons);
  } catch (err) {
    if (isUnknownSocialLinkIconsFieldError(err)) return {};
    throw err;
  }
}

export async function writeSocialLinkIconsMap(icons: SocialLinkIconsMap): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { PLATFORM_SITE_UI_KEY } = await import("@/lib/site-ui-settings");
  const payload = serializeSocialLinkIcons(icons);
  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: { key: PLATFORM_SITE_UI_KEY, socialLinkIcons: payload },
    update: { socialLinkIcons: payload },
  });
}
