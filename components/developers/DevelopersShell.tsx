"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { OperatorAllSidesNav } from "@/components/nav/OperatorAllSidesNav";
import { USER_GUIDES_INDEX_HREF } from "@/lib/audience-guides";
import { OPERATOR_ALL_SIDES_LINKS } from "@/lib/access-surfaces";

const DEV_NAV = [
  { href: "/developers", label: "Developer hub" },
  { href: "/developers/register", label: "Register app" },
  { href: "/developers/dashboard", label: "API dashboard" },
  { href: "/opgb", label: "OpenPayGB provider" },
  { href: "/opgb#integrate", label: "Integration guide" },
  { href: "/help/partner-api-overview", label: "Partner API docs" },
  { href: "/api/docs/guides/USER_GUIDE_PARTNER_INTEGRATOR.md", label: "Integrator guide" },
  { href: USER_GUIDES_INDEX_HREF, label: "All user guides" },
  { href: "/help", label: "Help center" },
];

const DASHBOARD_SECTIONS = [
  { href: "/developers/dashboard#overview", label: "Overview" },
  { href: "/developers/dashboard#settlement", label: "Settlement & cashout" },
  { href: "/developers/dashboard#transactions", label: "Transactions" },
  { href: "/developers/dashboard#fees", label: "Fees" },
  { href: "/developers/dashboard#branding", label: "White-label" },
  { href: "/developers/dashboard#api-keys", label: "API keys" },
  { href: "/developers/dashboard#webhooks", label: "Webhooks" },
  { href: "/developers/dashboard#oauth", label: "OAuth & OPGB APIs" },
  { href: "/opgb#charges", label: "Create a charge" },
  { href: "/opgb#webhooks", label: "Charge webhooks" },
  { href: "/opgb#checkout", label: "Hosted checkout" },
];

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
 * Developer-facing shell with hideable/collapsible sidebar (desktop) + mobile chrome.
 */
export function DevelopersShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const showAllSidesBanner = pathname === "/developers" || pathname === "/developers/";
  const onDashboard = pathname.startsWith("/developers/dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem("odelhub-devs-sidebar-collapsed");
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  function toggleSidebar() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("odelhub-devs-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="min-h-dvh bg-[#070b14] text-slate-200">
      <div className="hidden border-b border-emerald-500/20 bg-[#0a101f] md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Developers</p>
            <p className="text-[10px] text-slate-500">Builder portal · faces all product sides</p>
          </div>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {DEV_NAV.slice(0, 5).map((item) => (
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
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5"
            title={collapsed ? "Show sidebar" : "Hide sidebar"}
          >
            {collapsed ? "Show menu" : "Hide menu"}
          </button>
        </div>
      </div>

      <DashboardMobileChrome
        title="Developers"
        subtitle="Builder portal · all product sides"
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
      />

      <div className="mx-auto flex max-w-6xl gap-0 md:gap-6 px-0 md:px-4 py-0 md:py-8">
        <aside
          className={`hidden shrink-0 border-r border-white/10 bg-[#0a101f] md:block transition-[width,opacity] duration-200 ${
            collapsed ? "w-0 overflow-hidden border-0 opacity-0" : "w-56 opacity-100"
          }`}
        >
          {!collapsed ? (
            <div className="sticky top-4 space-y-4 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="mb-0 text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">Menu</p>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white"
                >
                  Collapse
                </button>
              </div>
              <nav className="flex flex-col gap-0.5 text-sm">
                {DEV_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-2.5 py-2 ${
                      navActive(pathname, item.href, hash)
                        ? "bg-emerald-500/15 text-emerald-100"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              {onDashboard ? (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Dashboard</p>
                  <nav className="flex flex-col gap-0.5 text-sm">
                    {DASHBOARD_SECTIONS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-lg px-2.5 py-1.5 ${
                          navActive(pathname, item.href, hash)
                            ? "bg-cyan-500/15 text-cyan-100"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ) : null}
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Product sides</p>
                <nav className="flex flex-col gap-0.5 text-xs">
                  {OPERATOR_ALL_SIDES_LINKS.filter((l) => l.kind !== "developer")
                    .slice(0, 8)
                    .map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-md px-2 py-1.5 text-slate-500 hover:bg-white/5 hover:text-emerald-100"
                      >
                        {link.label}
                      </Link>
                    ))}
                </nav>
              </div>
            </div>
          ) : null}
        </aside>

        <div className={`min-w-0 flex-1 space-y-6 px-4 py-6 md:px-0 md:py-0 ${collapsed ? "md:pl-0" : ""}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="mb-2 hidden rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200 md:inline-flex"
            >
              Show sidebar menu
            </button>
          ) : null}
          {showAllSidesBanner ? <OperatorAllSidesNav /> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
