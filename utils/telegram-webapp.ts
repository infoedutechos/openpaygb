/** Safe wrappers for Telegram WebApp SDK (methods may exist but throw on older clients, e.g. v6.0). */

export type TelegramWebApp = {
  version?: string;
  isVersionAtLeast?: (version: string) => boolean;
  exitFullscreen?: () => void;
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy') => void;
  };
};

export function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

/** `exitFullscreen` requires a recent Telegram client (Bot API 8.0+). No-op on v6.x and similar. */
export function safeTelegramExitFullscreen(): void {
  const tg = getTelegramWebApp();
  if (!tg?.exitFullscreen) return;
  if (typeof tg.isVersionAtLeast === 'function' && !tg.isVersionAtLeast('8.0')) return;
  try {
    tg.exitFullscreen();
  } catch {
    // WebAppMethodUnsupported on older Telegram builds
  }
}

export function safeTelegramHapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium'): void {
  const tg = getTelegramWebApp();
  const impact = tg?.HapticFeedback?.impactOccurred;
  if (!impact) return;
  try {
    impact(style);
  } catch {
    // HapticFeedback not supported in this WebApp version
  }
}
