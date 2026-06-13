import { z } from "zod";

export const PLATFORM_SITE_UI_KEY = "platform";

export const BUILTIN_SOCIAL_KEYS = [
  "whatsapp_group",
  "telegram_group",
  "telegram_channel",
  "telegram_support",
  "twitter",
  "tiktok",
  "youtube",
  "facebook",
  "instagram",
  "linkedin",
  "discord",
  "website",
] as const;

export type BuiltinSocialKey = (typeof BUILTIN_SOCIAL_KEYS)[number];

export const SocialLinkSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  url: z.string().max(2048),
  enabled: z.boolean(),
  showInFooter: z.boolean(),
  showInSupport: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export type SocialLink = z.infer<typeof SocialLinkSchema>;

/** Master/public API: link row with optional uploaded icon URL. */
export type SocialLinkDisplay = SocialLink & {
  iconUrl?: string | null;
  hasCustomIcon?: boolean;
};

export const BUILTIN_SOCIAL_LABELS: Record<BuiltinSocialKey, string> = {
  whatsapp_group: "WhatsApp Group",
  telegram_group: "Telegram Group",
  telegram_channel: "Telegram Channel",
  telegram_support: "Telegram Support",
  twitter: "X (Twitter)",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  discord: "Discord",
  website: "Website",
};

export type SiteUiSettingsRow = {
  key: string;
  footerMode: string;
  footerPathList: string[];
  footerIntro: string;
  footerShowQuickLinks: boolean;
  footerCopyrightVisible: boolean;
  checkoutPlatformFeeDefaultUgx: number;
  socialLinks: SocialLinkDisplay[];
  shareEnabled: boolean;
  shareDefaultTitle: string;
  shareDefaultText: string;
  supportPhone: string;
  supportEmail: string;
  communitySupportUrl: string;
  showSupportPhone: boolean;
  showSupportEmail: boolean;
  showCommunitySupport: boolean;
  homeScreenEnabled: boolean;
  homeScreenShowOnHome: boolean;
  homeScreenTitle: string;
  homeScreenShortName: string;
  homeScreenDescription: string;
  homeScreenThemeColor: string;
  hasPlatformLogo: boolean;
  platformLogoUploadedAt: string | null;
  platformLogoUrl: string | null;
  hasCopilotBubbleImage: boolean;
  copilotBubbleImageUploadedAt: string | null;
  copilotBubbleImageUrl: string | null;
  copilotAssistantName: string;
};

export type PublicSiteUiSettings = Pick<
  SiteUiSettingsRow,
  | "socialLinks"
  | "shareEnabled"
  | "shareDefaultTitle"
  | "shareDefaultText"
  | "supportPhone"
  | "supportEmail"
  | "communitySupportUrl"
  | "showSupportPhone"
  | "showSupportEmail"
  | "showCommunitySupport"
  | "footerIntro"
  | "footerShowQuickLinks"
  | "footerCopyrightVisible"
  | "footerMode"
  | "footerPathList"
  | "homeScreenEnabled"
  | "homeScreenShowOnHome"
  | "homeScreenTitle"
  | "homeScreenShortName"
  | "homeScreenDescription"
  | "homeScreenThemeColor"
  | "hasPlatformLogo"
  | "platformLogoUrl"
  | "hasCopilotBubbleImage"
  | "copilotBubbleImageUrl"
  | "copilotAssistantName"
>;

function envTelegramSupportUrl(): string {
  const direct = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL?.trim();
  if (direct) return direct;
  const bot = process.env.NEXT_PUBLIC_BOT_USERNAME?.trim();
  if (bot) return `https://t.me/${bot.replace(/^@/, "")}`;
  return "";
}

function defaultBuiltinLinks(): SocialLink[] {
  const channel = process.env.NEXT_PUBLIC_CHANNEL_LINK?.trim() ?? "";
  const telegramSupport = envTelegramSupportUrl();
  const defs: { key: BuiltinSocialKey; url: string; showInSupport?: boolean }[] = [
    { key: "whatsapp_group", url: "" },
    { key: "telegram_group", url: "" },
    { key: "telegram_channel", url: channel, showInSupport: false },
    { key: "telegram_support", url: telegramSupport, showInSupport: true },
    { key: "twitter", url: "" },
    { key: "tiktok", url: "" },
    { key: "youtube", url: "" },
    { key: "facebook", url: "" },
    { key: "instagram", url: "" },
    { key: "linkedin", url: "" },
    { key: "discord", url: "" },
    { key: "website", url: process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "" },
  ];
  return defs.map((d, i) => ({
    key: d.key,
    label: BUILTIN_SOCIAL_LABELS[d.key],
    url: d.url,
    enabled: Boolean(d.url),
    showInFooter: true,
    showInSupport: d.showInSupport ?? false,
    sortOrder: i * 10,
  }));
}

export function parseStoredSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const out: SocialLink[] = [];
  for (const item of raw) {
    const parsed = SocialLinkSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Merge stored links with built-in keys so master UI always has a full row set. */
export function mergeSocialLinks(stored: SocialLink[]): SocialLink[] {
  const defaults = defaultBuiltinLinks();
  const byKey = new Map<string, SocialLink>();
  for (const d of defaults) byKey.set(d.key, { ...d });
  for (const s of stored) {
    const prev = byKey.get(s.key);
    byKey.set(s.key, {
      ...(prev ?? {
        key: s.key,
        label: s.label || s.key,
        url: "",
        enabled: false,
        showInFooter: true,
        showInSupport: false,
        sortOrder: 500,
      }),
      ...s,
      label: s.label?.trim() || prev?.label || s.key,
    });
  }
  return [...byKey.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function footerVisibleForPath(settings: PublicSiteUiSettings, pathname: string): boolean {
  const mode = settings.footerMode?.trim() || "everywhere";
  if (mode === "off") return false;
  const list = settings.footerPathList ?? [];
  const matches = list.some((prefix) => {
    const p = prefix.trim();
    if (!p) return false;
    return pathname === p || pathname.startsWith(p);
  });
  if (mode === "hidden_on_list") return !matches;
  if (mode === "only_on_list") return matches;
  return true;
}

export function linksForFooter(links: SocialLink[]): SocialLink[] {
  return links.filter((l) => l.enabled && l.url.trim() && l.showInFooter);
}

export function linksForSupport(links: SocialLink[]): SocialLink[] {
  return links.filter((l) => l.enabled && l.url.trim() && l.showInSupport);
}

const FOOTER_MODES = ["everywhere", "off", "hidden_on_list", "only_on_list"] as const;

export const MasterSiteUiPatchSchema = z.object({
  socialLinks: z.array(SocialLinkSchema).max(40),
  shareEnabled: z.boolean(),
  shareDefaultTitle: z.string().min(1).max(120),
  shareDefaultText: z.string().max(500),
  supportPhone: z.string().max(40),
  supportEmail: z.string().max(120),
  communitySupportUrl: z.string().max(2048),
  showSupportPhone: z.boolean(),
  showSupportEmail: z.boolean(),
  showCommunitySupport: z.boolean(),
  footerIntro: z.string().max(2000),
  footerMode: z.enum(FOOTER_MODES),
  footerPathList: z.array(z.string().max(120)).max(40),
  footerShowQuickLinks: z.boolean(),
  footerCopyrightVisible: z.boolean(),
  homeScreenEnabled: z.boolean(),
  homeScreenShowOnHome: z.boolean(),
  homeScreenTitle: z.string().min(1).max(80),
  homeScreenShortName: z.string().min(1).max(32),
  homeScreenDescription: z.string().max(300),
  homeScreenThemeColor: z
    .string()
    .max(20)
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #0ea5e9"),
});
