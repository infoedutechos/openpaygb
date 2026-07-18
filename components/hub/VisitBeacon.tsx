"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Anonymous visit beacon — records page views + unique visitors (cookie) for MAC analytics.
 * Skips Next.js internals and API routes.
 */
export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api") || pathname.startsWith("/_next")) return;

    const controller = new AbortController();
    const t = window.setTimeout(() => {
      void fetch("/api/public/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname.slice(0, 200) }),
        credentials: "same-origin",
        keepalive: true,
        signal: controller.signal,
      }).catch(() => undefined);
    }, 400);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [pathname]);

  return null;
}
