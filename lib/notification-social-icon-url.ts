/** Same-origin social brand icons — avoids third-party CDN (CORB / OpaqueResponseBlocking). */
export function notificationSocialIconUrl(id: string): string {
  return `/api/notification-social-icon?id=${encodeURIComponent(id)}`;
}

export function resolveNotificationSocialIconUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  if (imageUrl.startsWith("/api/notification-social-icon")) return imageUrl;
  const legacy = imageUrl.match(/cdn\.simpleicons\.org\/([a-z0-9]+)/i);
  if (legacy?.[1]) return notificationSocialIconUrl(legacy[1].toLowerCase());
  return imageUrl;
}
