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
  /** Brand icon via Simple Icons CDN (square PNG). */
  imageUrl: string;
  emoji: string;
  brandColor: string;
};

export const NOTIFICATION_SOCIAL_LOGO_LIBRARY: SocialLogoOption[] = [
  { id: "telegram", name: "Telegram", imageUrl: "https://cdn.simpleicons.org/telegram/26A5E4", emoji: "✈️", brandColor: "#26A5E4" },
  { id: "whatsapp", name: "WhatsApp", imageUrl: "https://cdn.simpleicons.org/whatsapp/25D366", emoji: "💬", brandColor: "#25D366" },
  { id: "facebook", name: "Facebook", imageUrl: "https://cdn.simpleicons.org/facebook/0866FF", emoji: "📘", brandColor: "#0866FF" },
  { id: "instagram", name: "Instagram", imageUrl: "https://cdn.simpleicons.org/instagram/E4405F", emoji: "📸", brandColor: "#E4405F" },
  { id: "x", name: "X (Twitter)", imageUrl: "https://cdn.simpleicons.org/x/FFFFFF", emoji: "𝕏", brandColor: "#000000" },
  { id: "youtube", name: "YouTube", imageUrl: "https://cdn.simpleicons.org/youtube/FF0000", emoji: "▶️", brandColor: "#FF0000" },
  { id: "linkedin", name: "LinkedIn", imageUrl: "https://cdn.simpleicons.org/linkedin/0A66C2", emoji: "💼", brandColor: "#0A66C2" },
  { id: "tiktok", name: "TikTok", imageUrl: "https://cdn.simpleicons.org/tiktok/000000", emoji: "🎵", brandColor: "#000000" },
  { id: "github", name: "GitHub", imageUrl: "https://cdn.simpleicons.org/github/FFFFFF", emoji: "🐙", brandColor: "#181717" },
  { id: "google", name: "Google", imageUrl: "https://cdn.simpleicons.org/google/4285F4", emoji: "🔍", brandColor: "#4285F4" },
];

export function appendEmojiToText(current: string, emoji: string): string {
  const trimmed = current.trimEnd();
  if (!trimmed) return emoji;
  if (trimmed.endsWith(emoji)) return trimmed;
  return `${trimmed} ${emoji}`;
}
