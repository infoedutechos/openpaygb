import { notificationSocialIconUrl } from "@/lib/notification-social-icon-url";

/** Default brand icon for a built-in social link key (when no custom upload). */
export function defaultSocialLinkIconUrl(key: string): string | null {
  if (key.includes("whatsapp")) return notificationSocialIconUrl("whatsapp");
  if (key.includes("telegram")) return notificationSocialIconUrl("telegram");
  if (key === "twitter") return notificationSocialIconUrl("x");
  if (key === "tiktok") return notificationSocialIconUrl("tiktok");
  if (key === "youtube") return notificationSocialIconUrl("youtube");
  if (key === "facebook") return notificationSocialIconUrl("facebook");
  if (key === "instagram") return notificationSocialIconUrl("instagram");
  if (key === "linkedin") return notificationSocialIconUrl("linkedin");
  if (key === "website") return notificationSocialIconUrl("google");
  if (key === "discord") return notificationSocialIconUrl("github");
  return null;
}

export function resolveSocialLinkIconUrl(key: string, customIconUrl?: string | null): string | null {
  const custom = customIconUrl?.trim();
  if (custom) return custom;
  return defaultSocialLinkIconUrl(key);
}
