const PWA_DISPLAY_MODES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
  "(display-mode: window-controls-overlay)",
] as const;

/** True when the app runs as an installed PWA (home screen / desktop shortcut). */
export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return PWA_DISPLAY_MODES.some((q) => window.matchMedia(q).matches);
}

export function pwaDisplayModeMediaQueries(): readonly string[] {
  return PWA_DISPLAY_MODES;
}