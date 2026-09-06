import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { withPrismaRetry } from "@/lib/prisma-retry";

import {
  PLATFORM_BRAND_NAME,
  PLATFORM_COPILOT_NAME,
  normalizeCopilotName,
  normalizePlatformBrandName,
} from "@/lib/platform-brand";

export type PlatformBranding = {
  platformDisplayName: string;
  seoTitle: string;
  seoDescription: string;
  themeAccentHex: string;
  homeHeroHeadline: string;
  homeHeroSubhead: string;
  hubMaintenanceMessage: string;
  copilotAssistantName: string;
};

export type PlatformAuthPolicy = {
  adminSessionHours: number;
  adminRememberDays: number;
  studentSessionDays: number;
  checkoutSessionHours: number;
  pendingPaymentTtlHours: number;
  adminManualPaymentConfirm: boolean;
};

export const DEFAULT_PLATFORM_BRANDING: PlatformBranding = {
  platformDisplayName: PLATFORM_BRAND_NAME,
  seoTitle: "",
  seoDescription: "",
  themeAccentHex: "",
  homeHeroHeadline: "",
  homeHeroSubhead: "",
  hubMaintenanceMessage: "",
  copilotAssistantName: PLATFORM_COPILOT_NAME,
};

export const DEFAULT_PLATFORM_AUTH_POLICY: PlatformAuthPolicy = {
  adminSessionHours: 8,
  adminRememberDays: 30,
  studentSessionDays: 7,
  checkoutSessionHours: 24,
  pendingPaymentTtlHours: 48,
  adminManualPaymentConfirm: true,
};

const BrandingPatchSchema = z.object({
  platformDisplayName: z.string().min(1).max(80),
  seoTitle: z.string().max(120),
  seoDescription: z.string().max(400),
  themeAccentHex: z
    .string()
    .max(20)
    .refine((v) => !v.trim() || /^#[0-9A-Fa-f]{6}$/.test(v.trim()), "Use #RRGGBB or leave blank"),
  homeHeroHeadline: z.string().max(280),
  homeHeroSubhead: z.string().max(500),
  hubMaintenanceMessage: z.string().max(500),
  copilotAssistantName: z.string().min(1).max(80),
});

const AuthPolicyPatchSchema = z.object({
  adminSessionHours: z.number().int().min(1).max(168),
  adminRememberDays: z.number().int().min(1).max(365),
  studentSessionDays: z.number().int().min(1).max(365),
  checkoutSessionHours: z.number().int().min(1).max(168),
  pendingPaymentTtlHours: z.number().int().min(1).max(720),
  adminManualPaymentConfirm: z.boolean(),
});

export { BrandingPatchSchema, AuthPolicyPatchSchema };

function clampInt(n: unknown, fallback: number, min: number, max: number) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export async function getPlatformBranding(): Promise<PlatformBranding> {
  try {
    const row = await withPrismaRetry(() =>
      prisma.siteUiSettings.findUnique({
        where: { key: PLATFORM_SITE_UI_KEY },
        select: {
          platformDisplayName: true,
          seoTitle: true,
          seoDescription: true,
          themeAccentHex: true,
          homeHeroHeadline: true,
          homeHeroSubhead: true,
          hubMaintenanceMessage: true,
          copilotAssistantName: true,
          shareDefaultTitle: true,
        },
      }),
    );
    if (!row) return { ...DEFAULT_PLATFORM_BRANDING };
    return {
      platformDisplayName: normalizePlatformBrandName(
        row.platformDisplayName?.trim() || row.shareDefaultTitle?.trim() || DEFAULT_PLATFORM_BRANDING.platformDisplayName,
      ),
      seoTitle: row.seoTitle?.trim() || "",
      seoDescription: row.seoDescription?.trim() || "",
      themeAccentHex: row.themeAccentHex?.trim() || "",
      homeHeroHeadline: row.homeHeroHeadline?.trim() || "",
      homeHeroSubhead: row.homeHeroSubhead?.trim() || "",
      hubMaintenanceMessage: row.hubMaintenanceMessage?.trim() || "",
      copilotAssistantName: normalizeCopilotName(
        row.copilotAssistantName?.trim() || DEFAULT_PLATFORM_BRANDING.copilotAssistantName,
      ),
    };
  } catch (e) {
    console.warn("[platform-branding] load failed, using defaults", e);
    return { ...DEFAULT_PLATFORM_BRANDING };
  }
}

export async function savePlatformBranding(input: z.infer<typeof BrandingPatchSchema>): Promise<PlatformBranding> {
  const data = {
    platformDisplayName: input.platformDisplayName.trim(),
    seoTitle: input.seoTitle.trim(),
    seoDescription: input.seoDescription.trim(),
    themeAccentHex: input.themeAccentHex.trim(),
    homeHeroHeadline: input.homeHeroHeadline.trim(),
    homeHeroSubhead: input.homeHeroSubhead.trim(),
    hubMaintenanceMessage: input.hubMaintenanceMessage.trim(),
    copilotAssistantName: input.copilotAssistantName.trim(),
  };
  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: { key: PLATFORM_SITE_UI_KEY, ...data },
    update: data,
  });
  return getPlatformBranding();
}

export async function getPlatformAuthPolicy(): Promise<PlatformAuthPolicy> {
  try {
    const row = await withPrismaRetry(() =>
      prisma.siteUiSettings.findUnique({
        where: { key: PLATFORM_SITE_UI_KEY },
        select: {
          adminSessionHours: true,
          adminRememberDays: true,
          studentSessionDays: true,
          checkoutSessionHours: true,
          pendingPaymentTtlHours: true,
          adminManualPaymentConfirm: true,
        },
      }),
    );
    if (!row) return { ...DEFAULT_PLATFORM_AUTH_POLICY };
    return {
      adminSessionHours: clampInt(row.adminSessionHours, 8, 1, 168),
      adminRememberDays: clampInt(row.adminRememberDays, 30, 1, 365),
      studentSessionDays: clampInt(row.studentSessionDays, 7, 1, 365),
      checkoutSessionHours: clampInt(row.checkoutSessionHours, 24, 1, 168),
      pendingPaymentTtlHours: clampInt(row.pendingPaymentTtlHours, 48, 1, 720),
      adminManualPaymentConfirm: row.adminManualPaymentConfirm !== false,
    };
  } catch (e) {
    console.warn("[platform-auth-policy] load failed, using defaults", e);
    return { ...DEFAULT_PLATFORM_AUTH_POLICY };
  }
}

export async function savePlatformAuthPolicy(
  input: z.infer<typeof AuthPolicyPatchSchema>,
): Promise<PlatformAuthPolicy> {
  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: { key: PLATFORM_SITE_UI_KEY, ...input },
    update: { ...input },
  });
  return getPlatformAuthPolicy();
}

export function resolvedSeoTitle(b: PlatformBranding): string {
  if (b.seoTitle.trim()) return b.seoTitle.trim();
  return `${b.platformDisplayName} — Tuition, Play & Dex`;
}

export function resolvedSeoDescription(b: PlatformBranding): string {
  if (b.seoDescription.trim()) return b.seoDescription.trim();
  return "Tuition Hub: programme fees and settlement. Play Hub: engagement. Dex Hub: onramp & offramp rails — extensible ecosystem.";
}
