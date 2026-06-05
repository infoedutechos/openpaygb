import type { PlatformHub } from "@/lib/knowledge-base/types";

/** Infer which knowledge / notification audience applies to the current route. */
export function platformHubFromPathname(pathname: string): PlatformHub {
  const p = pathname.split("?")[0] ?? "/";
  if (p.startsWith("/admin/master")) return "admin";
  if (p.startsWith("/admin") || p.startsWith("/school")) return "admin";
  if (p.startsWith("/clicker") || p.startsWith("/play")) return "play";
  if (p.startsWith("/pay") || p.startsWith("/student") || p.startsWith("/receipt")) return "tuition";
  return "all";
}

/** Clicker embeds its own header widgets; avoid duplicate floating chrome there. */
export function platformAssistVisibleOnPath(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? "/";
  if (p.startsWith("/clicker")) return false;
  return true;
}
