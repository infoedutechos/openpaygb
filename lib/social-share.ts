export type ShareChannel =
  | "native"
  | "telegram"
  | "whatsapp"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "email"
  | "copy";

export type SharePayload = {
  url: string;
  title: string;
  text: string;
};

export function buildSharePayload(
  url: string,
  opts?: { title?: string; text?: string },
): SharePayload {
  const cleanUrl = url.trim();
  return {
    url: cleanUrl,
    title: opts?.title?.trim() || "ODEL HUB",
    text: opts?.text?.trim() || "",
  };
}

export function shareChannelUrl(channel: ShareChannel, payload: SharePayload): string | null {
  const { url, title, text } = payload;
  const combined = [text, url].filter(Boolean).join("\n\n");
  switch (channel) {
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || title)}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(combined)}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || title)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(combined)}`;
    case "native":
    case "copy":
      return null;
    default:
      return null;
  }
}

export const SHARE_CHANNELS: { id: ShareChannel; label: string }[] = [
  { id: "native", label: "Share…" },
  { id: "telegram", label: "Telegram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "twitter", label: "X (Twitter)" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "email", label: "Email" },
  { id: "copy", label: "Copy link" },
];

export async function copyShareLink(url: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export async function triggerNativeShare(payload: SharePayload): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({
      title: payload.title,
      text: payload.text || undefined,
      url: payload.url,
    });
    return true;
  } catch {
    return false;
  }
}

export function openShareUrl(url: string, telegramWebApp?: { openLink?: (u: string, o?: { try_instant_view?: boolean }) => void }) {
  if (telegramWebApp?.openLink) {
    telegramWebApp.openLink(url, { try_instant_view: false });
    return;
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
