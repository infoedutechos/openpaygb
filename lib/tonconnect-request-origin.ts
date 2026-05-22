import type { NextRequest } from "next/server";
import { getPublicOrigin } from "@/lib/public-url";

export function resolveTonConnectOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || req.headers.get("host")?.trim();
  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  const fallback = new URL(req.url).origin;
  return (getPublicOrigin() || fallback).replace(/\/$/, "");
}

export function resolveClientTonConnectOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
}
