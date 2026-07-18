"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { OperatorAllSidesNav } from "@/components/nav/OperatorAllSidesNav";
import { USER_GUIDES_INDEX_HREF } from "@/lib/audience-guides";
import { OPERATOR_ALL_SIDES_LINKS } from "@/lib/access-surfaces";

const DEV_NAV = [
  { href: "/developers", label: "Developer hub" },
  { href: "/developers/register", label: "Register app" },
  { href: "/developers/dashboard", label: "API dashboard" },
  { href: "/help/partner-api-overview", label: "Partner API docs" },
  { href: "/api/docs/guides/USER_GUIDE_PARTNER_INTEGRATOR.md", label: "Integrator guide" },
  { href: USER_GUIDES_INDEX_HREF, label: "All user guides" },
  { href: "/help", label: "Help center" },
];

function navActive(pathname: string, href: string): boolean {
  if (href === "/developers") return pathname === "/developers";
  if (href.includes("?")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Developer-facing shell. Builders own Partner API tools and can navigate every user side.
 */
export function DevelopersShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const showAllSidesBanner = pathname === "/developers" || pathname === "/developers/";

  return (
    <div className="min-h-dvh bg-[#070b14] text-slate-200">
      <div className="hidden border-b border-emerald-500/20 bg-[#0a101f] md:block">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Developers</p>
              <p className="text-[10px] text-slate-500">Builder portal · faces all product sides</p>
            </div>
            <nav className="flex flex-1 flex-wrap gap-1 text-sm">
              {DEV_NAV.slice(0, 4).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 ${
                    navActive(pathname, item.href)
                      ? "bg-emerald-500/15 text-emerald-100"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <nav className="flex flex-wrap gap-1.5 border-t border-white/5 pt-2 text-[11px]">
            <span className="mr-1 self-center text-slate-600">All sides:</span>
            {OPERATOR_ALL_SIDES_LINKS.filter((l) => l.kind !== "developer").slice(0, 8).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-white/10 px-2 py-1 text-slate-400 hover:border-emerald-400/40 hover:text-emerald-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <DashboardMobileChrome
        title="Developers"
        subtitle="Builder portal · all product sides"
        accent="emerald"
        panelId="developers-mobile-menu"
        items={DEV_NAV.map((item) => ({
          href: item.href,
          label: item.label,
          active: navActive(pathname, item.href),
        }))}
        secondarySections={[
          {
            id: "all-sides",
            label: "All product sides",
            items: OPERATOR_ALL_SIDES_LINKS.map((l) => ({ href: l.href, label: l.label })),
          },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:py-8">
        {showAllSidesBanner ? <OperatorAllSidesNav /> : null}
        {children}
      </div>
    </div>
  );
}
