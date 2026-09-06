import { absoluteUrl } from "@/lib/public-url";

/** Telegram Mini App entry for ODELPay HUB Pay / OpenPayGB tuition. */
export function getTmaAppUrl(startParam?: string): string {
  const base = absoluteUrl("/tma");
  if (!startParam?.trim()) return base;
  const u = new URL(base, base.startsWith("http") ? undefined : "https://placeholder.local");
  if (base.startsWith("http")) {
    u.searchParams.set("start", startParam.trim());
    return u.toString();
  }
  return `${base}?start=${encodeURIComponent(startParam.trim())}`;
}
