"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function labelForTarget(el: HTMLElement): string | null {
  const tracked = el.closest<HTMLElement>("[data-track]");
  if (tracked?.dataset.track) return tracked.dataset.track.slice(0, 120);

  const interactive = el.closest<HTMLElement>("button, a, [role='button'], input[type='submit']");
  if (!interactive) return null;

  // Skip noisy chrome
  if (interactive.closest("[data-no-track]")) return null;

  const aria = interactive.getAttribute("aria-label")?.trim();
  if (aria) return aria.slice(0, 120);

  const text = (interactive.innerText || interactive.textContent || "").replace(/\s+/g, " ").trim();
  if (text && text.length <= 80) return text.slice(0, 120);

  if (interactive instanceof HTMLAnchorElement && interactive.href) {
    try {
      const u = new URL(interactive.href, window.location.origin);
      return `link:${u.pathname.slice(0, 100)}`;
    } catch {
      return "link";
    }
  }

  return interactive.tagName.toLowerCase();
}

/**
 * Anonymous visit + action beacon for whole-ecosystem analytics.
 * Page views on route change; clicks/submits for MAC per-page actions.
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

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api") || pathname.startsWith("/_next")) return;

    let lastSent = "";
    let lastAt = 0;

    const send = (action: string) => {
      const now = Date.now();
      const key = `${pathname}|${action}`;
      if (key === lastSent && now - lastAt < 800) return;
      lastSent = key;
      lastAt = now;
      void fetch("/api/public/visit-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname.slice(0, 200), action }),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => undefined);
    };

    const onClick = (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof HTMLElement)) return;
      const label = labelForTarget(target);
      if (!label) return;
      send(`click:${label}`);
    };

    const onSubmit = (ev: Event) => {
      const target = ev.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (target.closest("[data-no-track]")) return;
      const name = target.getAttribute("name") || target.id || "form";
      send(`submit:${name.slice(0, 80)}`);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [pathname]);

  return null;
}
