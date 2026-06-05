import { headers } from "next/headers";
import { getPublicOrigin } from "@/lib/public-url";

/** Origin for the current request — matches document URL (fixes manifest start_url in local dev). */
export async function resolveRequestSiteOrigin(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || h.get("host")?.trim();
  if (host) {
    const proto =
      h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  const env = getPublicOrigin();
  if (env) return env;
  return "http://localhost:3000";
}
