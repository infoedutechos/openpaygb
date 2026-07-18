"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { USER_GUIDES_INDEX_HREF } from "@/lib/audience-guides";

const DEV_NAV = [
  { href: "/developers", label: "Developer hub" },
  { href: "/developers/register", label: "Register app" },
  { href: "/developers/dashboard", label: "Dashboard" },
  { href: "/help?hub=dex", label: "Integration FAQ" },
  { href: "/help/partner-api-overview", label: "Partner API docs" },
  { href: "/api/docs/guides/USER_GUIDE_PARTNER_INTEGRATOR.md", label: "Partner integrator guide" },
  { href: USER_GUIDES_INDEX_HREF, label: "All user guides" },
  { href: "/help", label: "Help center" },
  { href: "/login", label: "Log in chooser" },
  { href: "/", label: "Home" },
];

function navActive(pathname: string, href: string): boolean {
  if (href === "/developers") return pathname === "/developers";
  if (href.includes("?")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile hidable menu + desktop top bar for /developers (global SiteHeader is hidden).
 */
export function DevelopersShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="min-h-dvh bg-[#070b14] text-slate-200">
      <div className="hidden border-b border-emerald-500/20 bg-[#0a101f] md:block">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Developers</p>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {DEV_NAV.slice(0, 5).map((item) => (
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
      </div>

      <DashboardMobileChrome
        title="Developers"
        subtitle="Partner API · OPGB integrators"
        accent="emerald"
        panelId="developers-mobile-menu"
        items={DEV_NAV.map((item) => ({
          href: item.href,
          label: item.label,
          active: navActive(pathname, item.href),
        }))}
      />

      <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</div>
    </div>
  );
}
