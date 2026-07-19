"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { HELP_CENTER_HREF } from "@/lib/audience-guides";

const PLAY_DESTINATIONS = [
  { href: "/clicker", label: "Play Hub home" },
  { href: "/?hub=play", label: "Play on home switcher" },
  { href: "/pay", label: "Pay tuition" },
  { href: "/student/login", label: "Student sign in" },
  { href: "/dex", label: "Dex Hub" },
  { href: "/OdelPaySchools", label: "Schools lobby" },
  { href: "/OdelPayUniversities", label: "Universities lobby" },
  { href: "/help?hub=play", label: "Play help" },
  { href: HELP_CENTER_HREF, label: "Help center" },
  { href: "/login", label: "Log in chooser" },
  { href: "/", label: "Home" },
];

/** Ecosystem / help menu for Play Hub (URAPearls) — complements in-app bottom tabs. */
export function PlayHubMobileMenu() {
  const pathname = usePathname() ?? "";
  const items = useMemo(
    () =>
      PLAY_DESTINATIONS.map((d) => ({
        href: d.href,
        label: d.label,
        active: !d.href.includes("?") && (pathname === d.href || pathname.startsWith(`${d.href}/`)),
      })),
    [pathname],
  );

  return (
    <DashboardMobileChrome
      title="Play Hub"
      subtitle="URAPearls · ecosystem links"
      accent="amber"
      panelId="play-hub-mobile-menu"
      backHref={pathname.startsWith("/clicker") ? "/" : "/clicker"}
      backLabel={pathname.startsWith("/clicker") ? "Lobby" : "Play Hub"}
      items={items}
    />
  );
}
