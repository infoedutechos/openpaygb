"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CollapsibleNavLink } from "@/components/nav/CollapsibleNavLink";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { DashboardNotificationBell } from "@/components/nav/DashboardNotificationBell";
import { OperatorAllSidesNav } from "@/components/nav/OperatorAllSidesNav";
import { SidebarCollapseToggle } from "@/components/nav/SidebarCollapseToggle";
import { useCollapsibleSidebar } from "@/hooks/useCollapsibleSidebar";
import { USER_GUIDES_INDEX_HREF } from "@/lib/audience-guides";
import { OPERATOR_ALL_SIDES_LINKS } from "@/lib/access-surfaces";
import type { SidebarIconId } from "@/components/nav/sidebar-nav-icons";

const DEV_NAV: { href: string; label: string; navKey: string; iconId: SidebarIconId }[] = [
  { href: "/developers", label: "Developer hub", navKey: "dev.hub", iconId: "dev" },
  { href: "/developers/register", label: "Register / sign in", navKey: "dev.register", iconId: "auth" },
  { href: "/developers/dashboard", label: "API dashboard", navKey: "dev.dashboard", iconId: "dashboard" },
  { href: "/developers/dashboard#api-keys", label: "Generated API keys", navKey: "dev.api-keys", iconId: "api" },
  { href: "/developers/dashboard#opgb-card", label: "OPGB Card", navKey: "dev.opgb-card", iconId: "card" },
  { href: "/developers/dashboard#woocommerce", label: "WooCommerce", navKey: "dev.woocommerce", iconId: "woo" },
  { href: "/integrations/woocommerce", label: "WooCommerce plugin", navKey: "dev.woocommerce-plugin", iconId: "woo" },
  { href: "/opgb", label: "OpenPayGB provider", navKey: "dev.opgb", iconId: "shield" },
  { href: "/opgb#integrate", label: "Integration guide", navKey: "dev.integrate", iconId: "docs" },
  { href: "/developers/advertise", label: "Advertise (ads API)", navKey: "dev.advertise", iconId: "advertise" },
  { href: "/help/partner-api-overview", label: "Partner API docs", navKey: "dev.partner-docs", iconId: "partner" },
  { href: "/api/docs/guides/USER_GUIDE_PARTNER_INTEGRATOR.md", label: "Integrator guide", navKey: "dev.integrator", iconId: "guides" },
  { href: USER_GUIDES_INDEX_HREF, label: "All user guides", navKey: "dev.guides", iconId: "guides" },
  { href: "/help", label: "Help center", navKey: "dev.help", iconId: "knowledge" },
];

const DASHBOARD_SECTIONS: { href: string; label: string; navKey: string; iconId: SidebarIconId }[] = [
  { href: "/developers/dashboard#overview", label: "Overview", navKey: "dev.dashboard__overview", iconId: "dashboard" },
  { href: "/developers/dashboard#settlement", label: "Settlement & cashout", navKey: "dev.dashboard__settlement", iconId: "settlement" },
  { href: "/developers/dashboard#transactions", label: "Transactions", navKey: "dev.dashboard__transactions", iconId: "ledger" },
  { href: "/developers/dashboard#fees", label: "Fees", navKey: "dev.dashboard__fees", iconId: "fees" },
  { href: "/developers/dashboard#branding", label: "White-label", navKey: "dev.dashboard__branding", iconId: "branding" },
  { href: "/developers/dashboard#api-keys", label: "Generated API keys", navKey: "dev.api-keys", iconId: "api" },
  { href: "/developers/dashboard#webhooks", label: "Webhooks", navKey: "dev.dashboard__webhooks", iconId: "network" },
  { href: "/developers/dashboard#opgb-card", label: "OPGB Card (TON / MoMo)", navKey: "dev.opgb-card", iconId: "card" },
  { href: "/developers/dashboard#oauth", label: "OAuth & OPGB APIs", navKey: "dev.dashboard__oauth", iconId: "auth" },
  { href: "/developers/dashboard#woocommerce", label: "WooCommerce plugin", navKey: "dev.woocommerce", iconId: "woo" },
  { href: "/integrations/woocommerce/odelhub-openpaygb", label: "Download · odelhub-openpaygb", navKey: "dev.woo-download", iconId: "backup" },
  { href: "/opgb#charges", label: "Create a charge", navKey: "dev.charges", iconId: "pay" },
  { href: "/opgb#webhooks", label: "Charge webhooks", navKey: "dev.charge-webhooks", iconId: "network" },
  { href: "/opgb#checkout", label: "Hosted checkout", navKey: "dev.checkout", iconId: "payments" },
];

const SIDEBAR_KEY = "odelhub-devs-sidebar-collapsed";

function navActive(pathname: string, href: string, hash = ""): boolean {
  if (href === "/developers") return pathname === "/developers";
  if (href.includes("?")) return false;
  if (href.includes("#")) {
    const [base, section] = href.split("#");
    if (pathname !== base && !pathname.startsWith(`${base}/`)) return false;
    if (!section) return true;
    const current = hash.replace(/^#/, "") || "overview";
    return current === section;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Developer-facing shell: left sidebar always discoverable (narrow strip when collapsed).
 * Mobile: hamburger menu. Developer app session is separate from master/school/student login.
 */
export function DevelopersShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const showAllSidesBanner = pathname === "/developers" || pathname === "/developers/";
  const onDashboard = pathname.startsWith("/developers/dashboard");
  const { collapsed, toggle, expand } = useCollapsibleSidebar(SIDEBAR_KEY);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-[#070b14] text-slate-200">
      <div className="hidden border-b border-emerald-500/20 bg-[#0a101f] md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Developers</p>
            <p className="text-[10px] text-slate-500">Builder portal · Partner API · OpenPayGB</p>
          </div>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {DEV_NAV.slice(0, 8).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 py-1.5 ${
                  navActive(pathname, item.href, hash)
                    ? "bg-emerald-500/15 text-emerald-100"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <DashboardNotificationBell hub="dex" />
            <SidebarCollapseToggle collapsed={collapsed} onToggle={toggle} accent="emerald" />
          </div>
        </div>
      </div>

      <DashboardMobileChrome
        title="Developers"
        subtitle="Tap Menu for navigation"
        accent="emerald"
        panelId="developers-mobile-menu"
        backHref={pathname === "/developers" || pathname === "/developers/" ? "/" : "/developers"}
        backLabel={pathname === "/developers" || pathname === "/developers/" ? "Lobby" : "Developers home"}
        items={[
          ...DEV_NAV.map((item) => ({
            href: item.href,
            label: item.label,
            active: navActive(pathname, item.href, hash),
          })),
          ...(onDashboard
            ? DASHBOARD_SECTIONS.map((s) => ({
                href: s.href,
                label: s.label,
                active: navActive(pathname, s.href, hash),
              }))
            : []),
        ]}
        secondarySections={[
          {
            id: "all-sides",
            label: "All product sides",
            items: OPERATOR_ALL_SIDES_LINKS.map((l) => ({ href: l.href, label: l.label })),
          },
        ]}
        trailing={<DashboardNotificationBell hub="dex" />}
      />

      <div className="mx-auto flex max-w-6xl gap-0 md:gap-4 px-0 md:px-4 py-0 md:py-8">
        {/* Desktop sidebar: full menu, or narrow always-visible strip when collapsed */}
        <aside
          className={`relative hidden shrink-0 border-r border-white/10 bg-[#0a101f] transition-[width] duration-200 md:block ${
            collapsed ? "w-14" : "w-56"
          }`}
          aria-label="Developers sidebar"
        >
          <div className={`sticky top-4 space-y-3 ${collapsed ? "p-2" : "p-4"}`}>
            <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between gap-2"}`}>
              {!collapsed ? (
                <p className="mb-0 text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">Menu</p>
              ) : null}
              <div className={`flex items-center gap-1.5 ${collapsed ? "flex-col" : ""}`}>
                <DashboardNotificationBell hub="dex" />
                <SidebarCollapseToggle collapsed={collapsed} onToggle={toggle} accent="emerald" />
              </div>
            </div>
            <nav className={`flex flex-col gap-0.5 text-sm ${collapsed ? "items-center" : ""}`}>
              {DEV_NAV.map((item) => (
                <CollapsibleNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  navKey={item.navKey}
                  iconId={item.iconId}
                  collapsed={collapsed}
                  active={navActive(pathname, item.href, hash)}
                  accent="emerald"
                  onClick={collapsed ? expand : undefined}
                />
              ))}
            </nav>
            {onDashboard ? (
              <div className={collapsed ? "pt-2" : "border-t border-white/10 pt-3"}>
                {!collapsed ? (
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Dashboard</p>
                ) : null}
                <nav className={`flex flex-col gap-0.5 text-sm ${collapsed ? "items-center" : ""}`}>
                  {DASHBOARD_SECTIONS.map((s) => (
                    <CollapsibleNavLink
                      key={s.href}
                      href={s.href}
                      label={s.label}
                      navKey={s.navKey}
                      iconId={s.iconId}
                      collapsed={collapsed}
                      active={navActive(pathname, s.href, hash)}
                      accent="emerald"
                      onClick={collapsed ? expand : undefined}
                    />
                  ))}
                </nav>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6 px-4 py-6 md:px-0 md:py-0">
          {collapsed ? (
            <p className="hidden text-xs text-slate-500 md:block">
              Sidebar collapsed — use ◂ / ▸ or{" "}
              <button type="button" onClick={expand} className="text-emerald-300 underline">
                expand sidebar
              </button>
              .
            </p>
          ) : null}
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-500 md:hidden">
            On phones, open navigation with the <strong className="text-emerald-300">Menu</strong> button (top right).
            Developer sign-in is separate from school/master login.
          </p>
          {showAllSidesBanner ? <OperatorAllSidesNav /> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
