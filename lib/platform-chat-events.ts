export const PLATFORM_CHAT_OPEN_EVENT = "odelhub:open-platform-chat";

/** Opens the floating KB copilot (listened to by PlatformCopilotChat). */
export function openPlatformChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PLATFORM_CHAT_OPEN_EVENT));
}
