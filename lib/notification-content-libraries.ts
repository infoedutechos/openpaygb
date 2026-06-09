import { notificationSocialIconUrl } from "@/lib/notification-social-icon-url";

/** Curated emoji groups for Master Admin push / Telegram notifications. */
export type EmojiCategory = {
  id: string;
  label: string;
  emojis: string[];
};

export const NOTIFICATION_EMOJI_LIBRARY: EmojiCategory[] = [
  {
    id: "celebration",
    label: "Celebration",
    emojis: ["🎉", "🎊", "✨", "🥳", "🏆", "💫", "🌟", "👏", "🙌", "💐"],
  },
  {
    id: "alert",
    label: "Alerts",
    emojis: ["📢", "🔔", "⚠️", "🚨", "❗", "‼️", "📣", "🔴", "🟡", "🟢"],
  },
  {
    id: "education",
    label: "School & tuition",
    emojis: ["🎓", "📚", "🏫", "📝", "✏️", "📖", "🧑‍🎓", "👩‍🏫", "📅", "🎯"],
  },
  {
    id: "payments",
    label: "Payments",
    emojis: ["💳", "💰", "💵", "🪙", "💎", "📈", "✅", "🧾", "🏦", "💸"],
  },
  {
    id: "community",
    label: "Community",
    emojis: ["❤️", "🤝", "🌍", "🇺🇬", "🙏", "💬", "👋", "🤗", "💙", "🫶"],
  },
  {
    id: "tech",
    label: "Tech & apps",
    emojis: ["📱", "💻", "🔗", "🛡️", "⚡", "🚀", "🔐", "🌐", "🤖", "📲"],
  },
];

export type SocialLogoOption = {
  id: string;
  name: string;
  /** Same-origin SVG via `/api/notification-social-icon`. */
  imageUrl: string;
  emoji: string;
  brandColor: string;
};

export const NOTIFICATION_SOCIAL_LOGO_LIBRARY: SocialLogoOption[] = [
  { id: "telegram", name: "Telegram", imageUrl: notificationSocialIconUrl("telegram"), emoji: "✈️", brandColor: "#26A5E4" },
  { id: "whatsapp", name: "WhatsApp", imageUrl: notificationSocialIconUrl("whatsapp"), emoji: "💬", brandColor: "#25D366" },
  { id: "facebook", name: "Facebook", imageUrl: notificationSocialIconUrl("facebook"), emoji: "📘", brandColor: "#0866FF" },
  { id: "instagram", name: "Instagram", imageUrl: notificationSocialIconUrl("instagram"), emoji: "📸", brandColor: "#E4405F" },
  { id: "x", name: "X (Twitter)", imageUrl: notificationSocialIconUrl("x"), emoji: "𝕏", brandColor: "#000000" },
  { id: "youtube", name: "YouTube", imageUrl: notificationSocialIconUrl("youtube"), emoji: "▶️", brandColor: "#FF0000" },
  { id: "linkedin", name: "LinkedIn", imageUrl: notificationSocialIconUrl("linkedin"), emoji: "💼", brandColor: "#0A66C2" },
  { id: "tiktok", name: "TikTok", imageUrl: notificationSocialIconUrl("tiktok"), emoji: "🎵", brandColor: "#000000" },
  { id: "github", name: "GitHub", imageUrl: notificationSocialIconUrl("github"), emoji: "🐙", brandColor: "#181717" },
  { id: "google", name: "Google", imageUrl: notificationSocialIconUrl("google"), emoji: "🔍", brandColor: "#4285F4" },
];

export function appendEmojiToText(current: string, emoji: string): string {
  const trimmed = current.trimEnd();
  if (!trimmed) return emoji;
  if (trimmed.endsWith(emoji)) return trimmed;
  return `${trimmed} ${emoji}`;
}
