import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-settings";
import {
  platformLogoContentType,
  type PlatformLogoContentType,
} from "@/lib/validate-platform-logo";

export const COPILOT_BUBBLE_PATH = "/api/platform/copilot-bubble";

export function copilotBubbleImageUrl(uploadedAt: Date | string | null | undefined): string | null {
  if (!uploadedAt) return null;
  const t = typeof uploadedAt === "string" ? uploadedAt : uploadedAt.toISOString();
  return `${COPILOT_BUBBLE_PATH}?v=${encodeURIComponent(t)}`;
}

export async function getCopilotBubbleImageRecord(): Promise<{
  bytes: Buffer | null;
  uploadedAt: Date | null;
  contentType: PlatformLogoContentType | null;
}> {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: { copilotBubbleImage: true, copilotBubbleImageUploadedAt: true },
  });
  if (!row?.copilotBubbleImage?.length || !row.copilotBubbleImageUploadedAt) {
    return { bytes: null, uploadedAt: null, contentType: null };
  }
  const bytes = Buffer.from(row.copilotBubbleImage);
  return {
    bytes,
    uploadedAt: row.copilotBubbleImageUploadedAt,
    contentType: platformLogoContentType(bytes),
  };
}
