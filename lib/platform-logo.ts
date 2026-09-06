import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-settings";
import { PLATFORM_LOGO_PATH } from "@/lib/platform-logo-path";
import {
  platformLogoContentType,
  type PlatformLogoContentType,
} from "@/lib/validate-platform-logo";

export { PLATFORM_LOGO_PATH };

export function platformLogoUrl(uploadedAt: Date | string | null | undefined): string | null {
  if (!uploadedAt) return null;
  const t = typeof uploadedAt === "string" ? uploadedAt : uploadedAt.toISOString();
  return `${PLATFORM_LOGO_PATH}?v=${encodeURIComponent(t)}`;
}

export async function getPlatformLogoRecord(): Promise<{
  bytes: Buffer | null;
  uploadedAt: Date | null;
  contentType: PlatformLogoContentType | null;
}> {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: { platformLogo: true, platformLogoUploadedAt: true },
  });
  if (!row?.platformLogo?.length || !row.platformLogoUploadedAt) {
    return { bytes: null, uploadedAt: null, contentType: null };
  }
  const bytes = Buffer.from(row.platformLogo);
  return {
    bytes,
    uploadedAt: row.platformLogoUploadedAt,
    contentType: platformLogoContentType(bytes),
  };
}
