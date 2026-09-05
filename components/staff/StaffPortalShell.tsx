"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardGuideNavLinks } from "@/components/nav/DashboardGuideNavLinks";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { staffGuidesForPortal } from "@/lib/audience-guides";

const NAV: { href: string; label: string }[] = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/profile", label: "My profile" },
  { href: "/staff/card", label: "OpenPayGB Card" },
  { href: "/staff/salary", label: "Salary history" },
  { href: "/staff/advertise", label: "Advertise" },
  { href: "/", label: "Lobby" },
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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-[#0a101f] py-6 pl-4 pr-2 md:flex">
        <div className="space-y-3 px-2 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">Staff portal</p>
            <p className="mt-1 text-sm text-slate-500">Profile & salary</p>
          </div>
          {brief ? (
            <WelcomeBackStrip
              name={brief.name}
              role="staff"
              previousLoginAt={brief.previousLoginAt}
            />
          ) : null}
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 transition-colors ${
                navActive(pathname, item.href)
                  ? "bg-amber-500/15 font-medium text-amber-100"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <DashboardGuideNavLinks guides={guides} />
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-auto rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Log out
          </button>
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
            <button
              type="button"
              onClick={() => void logout()}
              className="text-xs font-medium text-slate-400 hover:text-white"
            >
              Log out
            </button>
          }
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
