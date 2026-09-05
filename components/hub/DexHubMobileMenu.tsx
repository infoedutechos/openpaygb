"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { HUBS } from "@/lib/ecosystem/hubs";
import { AUDIENCE_GUIDES, HELP_CENTER_HREF } from "@/lib/audience-guides";

const DEX_DESTINATIONS = [
  { href: "/dex", label: "Dex Hub home" },
  { href: HUBS.dex.routes?.onramp ?? "/dex/onramp", label: "Onramp" },
  { href: HUBS.dex.routes?.offramp ?? "/dex/offramp", label: "Offramp" },
  { href: HUBS.dex.routes?.convert ?? "/dex/convert", label: "Convert" },
  { href: HUBS.dex.routes?.buy ?? "/dex/buy", label: "Buy crypto" },
  { href: "/dex/sell", label: "Sell crypto" },
  { href: HUBS.dex.routes?.p2p ?? "/dex/p2p", label: "P2P market" },
  { href: HUBS.dex.routes?.amm ?? "/dex/amm", label: "AMM swap" },
  { href: "/opgb", label: "OpenPayGB platform" },
  { href: "/pay", label: "Pay tuition" },
  { href: "/play", label: "Play Hub" },
  { href: "/student/login", label: "Student sign in" },
  { href: "/help?hub=dex", label: "Dex help" },
  { href: HELP_CENTER_HREF, label: "Help center" },
  { href: AUDIENCE_GUIDES.student_higher.helpHref, label: AUDIENCE_GUIDES.student_higher.label },
  { href: "/", label: "Home" },
];

function active(pathname: string, href: string): boolean {
  if (href.includes("?")) return false;
  if (href === "/dex") return pathname === "/dex" || pathname === "/opgb";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Hidable full destination menu above Dex/OPGB bottom dock (mobile). */
export function DexHubMobileMenu() {
  const pathname = usePathname() ?? "";
  const items = useMemo(
    () =>
      DEX_DESTINATIONS.map((d) => ({
        href: d.href,
        label: d.label,
        active: active(pathname, d.href),
      })),
    [pathname],
  );

  return (
    <DashboardMobileChrome
      title="Dex Hub"
      subtitle="OpenPayGB · buy · convert · offramp"
      accent="violet"
      panelId="dex-hub-mobile-menu"
      backHref={pathname === "/dex" || pathname === "/opgb" ? "/" : "/dex"}
      backLabel={pathname === "/dex" || pathname === "/opgb" ? "Lobby" : "Dex Hub"}
      items={items}
    />
  );
}
