"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CollapsibleNavLink } from "@/components/nav/CollapsibleNavLink";
import { DashboardGuideNavLinks } from "@/components/nav/DashboardGuideNavLinks";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { DashboardNotificationBell } from "@/components/nav/DashboardNotificationBell";
import { SidebarCollapseToggle } from "@/components/nav/SidebarCollapseToggle";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { useCollapsibleSidebar } from "@/hooks/useCollapsibleSidebar";
import { staffGuidesForPortal } from "@/lib/audience-guides";
import type { SidebarIconId } from "@/components/nav/sidebar-nav-icons";

const NAV: { href: string; label: string; navKey: string; iconId: SidebarIconId }[] = [
  { href: "/staff", label: "Dashboard", navKey: "staff.dashboard", iconId: "dashboard" },
  { href: "/staff/profile", label: "My profile", navKey: "staff.profile", iconId: "profile" },
  { href: "/staff/card", label: "OpenPayGB Card", navKey: "staff.card", iconId: "card" },
  { href: "/staff/salary", label: "Salary history", navKey: "staff.salary", iconId: "salary" },
  { href: "/staff/advertise", label: "Advertise", navKey: "staff.advertise", iconId: "advertise" },
  { href: "/", label: "Lobby", navKey: "staff.lobby", iconId: "lobby" },
];

function navActive(pathname: string, href: string): boolean {
  if (href === "/staff") return pathname === "/staff";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type StaffBrief = {
  name: string;
  previousLoginAt: string | null;
};

export function StaffPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const guides = staffGuidesForPortal();
  const [brief, setBrief] = useState<StaffBrief | null>(null);
  const { collapsed, toggle } = useCollapsibleSidebar("odelhub-staff-sidebar-collapsed");

  useEffect(() => {
    if (pathname === "/staff/login" || pathname.startsWith("/staff/login/")) return;
    void fetch("/api/staff/me", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return;
        const j = (await r.json()) as {
          staff: { name: string; previousLoginAt: string | null };
        };
        setBrief({ name: j.staff.name, previousLoginAt: j.staff.previousLoginAt });
      })
      .catch(() => undefined);
  }, [pathname]);

  if (pathname === "/staff/login" || pathname.startsWith("/staff/login/")) {
    return <>{children}</>;
  }

  async function logout() {
    await fetch("/api/auth/staff-logout", { method: "POST", credentials: "include" });
    router.replace("/staff/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh bg-[#070b14] text-slate-200">
      <aside
        className={`hidden shrink-0 flex-col border-r border-white/10 bg-[#0a101f] py-4 transition-[width] duration-200 md:flex ${
          collapsed ? "w-14 items-center px-1.5" : "w-56 pl-4 pr-2"
        }`}
      >
        <div className={`mb-4 flex w-full items-start ${collapsed ? "justify-center" : "justify-between gap-2 px-2"}`}>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">Staff portal</p>
              <p className="mt-1 text-sm text-slate-500">Profile & salary</p>
            </div>
          ) : null}
          <div className={`flex items-center gap-1.5 ${collapsed ? "flex-col" : ""}`}>
            <DashboardNotificationBell hub="all" />
            <SidebarCollapseToggle collapsed={collapsed} onToggle={toggle} accent="amber" />
          </div>
        </div>
        {!collapsed && brief ? (
          <div className="mb-4 px-2">
            <WelcomeBackStrip
              name={brief.name}
              role="staff"
              previousLoginAt={brief.previousLoginAt}
            />
          </div>
        ) : null}
        <nav className={`flex flex-1 flex-col gap-0.5 text-sm ${collapsed ? "items-center" : ""}`}>
          {NAV.map((item) => (
            <CollapsibleNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              navKey={item.navKey}
              iconId={item.iconId}
              collapsed={collapsed}
              active={navActive(pathname, item.href)}
              accent="amber"
            />
          ))}
          {!collapsed ? (
            <>
              <DashboardGuideNavLinks guides={guides} />
              <button
                type="button"
                onClick={() => void logout()}
                className="mt-auto rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              title="Log out"
              onClick={() => void logout()}
              className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-rose-300/80 hover:bg-white/5"
            >
              ×
            </button>
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileChrome
          title="Staff portal"
          subtitle="Profile & salary"
          accent="amber"
          panelId="staff-portal-mobile-menu"
          backHref={pathname === "/staff" || pathname === "/staff/" ? "/" : "/staff"}
          backLabel={pathname === "/staff" || pathname === "/staff/" ? "Lobby" : "Staff home"}
          items={NAV.map((item) => ({
            href: item.href,
            label: item.label,
            active: navActive(pathname, item.href),
          }))}
          secondarySections={[
            {
              id: "guides",
              label: "Guides",
              items: guides.map((g) => ({ href: g.helpHref, label: g.dashboardLabel })),
            },
          ]}
          trailing={
            <div className="flex items-center gap-2">
              <DashboardNotificationBell hub="all" />
              <button
                type="button"
                onClick={() => void logout()}
                className="text-xs font-medium text-slate-400 hover:text-white"
              >
                Log out
              </button>
            </div>
          }
        />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
