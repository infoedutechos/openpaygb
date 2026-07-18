import "server-only";

import { prisma } from "@/lib/prisma";
import { getPlatformBranding, DEFAULT_PLATFORM_BRANDING } from "@/lib/platform-customisation";
import { platformLogoUrl } from "@/lib/platform-logo";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { appBaseUrl } from "@/lib/root-metadata";
import type { ReceiptBranding, ReceiptBrandingBlock } from "@/lib/receipt-branding-types";

export type { ReceiptBranding, ReceiptBrandingBlock } from "@/lib/receipt-branding-types";

function absUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl?.trim()) return null;
  const t = pathOrUrl.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  const base = appBaseUrl().replace(/\/$/, "");
  return `${base}${t.startsWith("/") ? t : `/${t}`}`;
}

/**
 * Dual letterhead for official receipts: MAC platform brand + school/org brand.
 */
export async function getReceiptBranding(organizationId: string): Promise<ReceiptBranding> {
  const [org, branding, siteUi] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        slug: true,
        institutionTier: true,
        registrationWebsiteUrl: true,
        registrationContactEmail: true,
        letterheadPhone: true,
        letterheadEmail: true,
        letterheadAddress: true,
        letterheadLogoUploadedAt: true,
        faviconUploadedAt: true,
      },
    }),
    getPlatformBranding(),
    prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: {
        supportPhone: true,
        supportEmail: true,
        platformLogoUploadedAt: true,
        showSupportPhone: true,
        showSupportEmail: true,
      },
    }),
  ]);

  const platformName =
    branding.platformDisplayName?.trim() || DEFAULT_PLATFORM_BRANDING.platformDisplayName;
  const supportPhone =
    siteUi?.showSupportPhone === false
      ? ""
      : siteUi?.supportPhone?.trim() || process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || "";
  const supportEmail =
    siteUi?.showSupportEmail === false
      ? ""
      : siteUi?.supportEmail?.trim() || process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";

  const schoolEmail = org?.letterheadEmail?.trim() || org?.registrationContactEmail?.trim() || "";
  const schoolPhone = org?.letterheadPhone?.trim() || "";
  const schoolAddress = org?.letterheadAddress?.trim() || "";
  const schoolWebsite = org?.registrationWebsiteUrl?.trim() || "";

  let schoolLogoPath: string | null = null;
  if (org?.letterheadLogoUploadedAt && org.slug) {
    schoolLogoPath = `/api/org/${encodeURIComponent(org.slug)}/letterhead-logo?v=${encodeURIComponent(org.letterheadLogoUploadedAt.toISOString())}`;
  } else if (org?.faviconUploadedAt && org.slug) {
    schoolLogoPath = `/api/org/${encodeURIComponent(org.slug)}/favicon?v=${encodeURIComponent(org.faviconUploadedAt.toISOString())}`;
  }

  const platform: ReceiptBrandingBlock = {
    name: platformName,
    logoUrl: absUrl(platformLogoUrl(siteUi?.platformLogoUploadedAt ?? null)),
    phone: supportPhone,
    email: supportEmail,
    address: "",
    website: absUrl("/") ?? "",
  };

  const school: ReceiptBrandingBlock = {
    name: org?.name?.trim() || "School",
    logoUrl: absUrl(schoolLogoPath),
    phone: schoolPhone,
    email: schoolEmail,
    address: schoolAddress,
    website: schoolWebsite,
  };

  return {
    platform,
    school,
    periodLabel: org?.institutionTier === "school" ? "Term" : "Semester",
  };
}
