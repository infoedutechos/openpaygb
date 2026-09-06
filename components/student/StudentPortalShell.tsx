"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CollapsibleNavLink } from "@/components/nav/CollapsibleNavLink";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";
import { DashboardGuideNavLinks } from "@/components/nav/DashboardGuideNavLinks";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { DashboardNotificationBell } from "@/components/nav/DashboardNotificationBell";
import { PageBackLink } from "@/components/nav/PageBackLink";
import { SidebarCollapseToggle } from "@/components/nav/SidebarCollapseToggle";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { useCollapsibleSidebar } from "@/hooks/useCollapsibleSidebar";
import { useStudentMe } from "@/hooks/useStudentMe";
import { profileFromStudentMe } from "@/lib/profile-mappers";
import { DEX_SIDEBAR_NAV, pathnameIsDexHub } from "@/lib/dex-nav";
import { studentGuidesForPortal } from "@/lib/audience-guides";
import type { SidebarIconId } from "@/components/nav/sidebar-nav-icons";

export type StudentPortalShellMode = "my" | "student";

function isBareStudentPath(pathname: string): boolean {
  if (pathname === "/student/login" || pathname.startsWith("/student/login/")) return true;
  if (pathname === "/student/register" || pathname.startsWith("/student/register/")) return true;
  if (pathname === "/student/guest" || pathname.startsWith("/student/guest/")) return true;
  if (pathname === "/student/claim" || pathname.startsWith("/student/claim/")) return true;
  return false;
}

function navActive(pathname: string, href: string): boolean {
  if (href === "/student") return pathname === "/student";
  if (href === "/my/dashboard") return pathname === "/my/dashboard";
  if (href === "/my/receipts") return pathname === "/my/receipts";
  if (href === "/student/card") return pathname === "/student/card";
  if (href === "/student/balance") return pathname === "/student/balance";
  if (href === "/my/profile") return pathname === "/my/profile";
  if (href === DEX_SIDEBAR_NAV.href) return pathnameIsDexHub(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV: { href: string; label: string; navKey: string; iconId: SidebarIconId }[] = [
  { href: "/my/dashboard", label: "Dashboard", navKey: "student.dashboard", iconId: "dashboard" },
  { href: "/my/profile", label: "Profile", navKey: "student.profile", iconId: "profile" },
  { href: "/student/balance", label: "Tuition balance", navKey: "student.balance", iconId: "balance" },
  { href: "/my/receipts", label: "Receipts & history", navKey: "student.receipts", iconId: "receipts" },
  { href: "/student/pay", label: "Pay tuition", navKey: "student.pay", iconId: "pay" },
  { href: "/student/card", label: "OpenPayGB Card", navKey: "student.card", iconId: "card" },
  { href: "/my/advertise", label: "Advertise", navKey: "student.advertise", iconId: "advertise" },
  { href: DEX_SIDEBAR_NAV.href, label: DEX_SIDEBAR_NAV.label, navKey: "shared.dex", iconId: "dex" },
  { href: "/student", label: "Student home", navKey: "student.home", iconId: "home" },
  { href: "/", label: "Lobby", navKey: "student.lobby", iconId: "lobby" },
];

export function StudentPortalShell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: StudentPortalShellMode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { data: studentMe } = useStudentMe();
  const studentProfile = studentMe?.student ? profileFromStudentMe(studentMe.student) : null;
  const guides = studentGuidesForPortal();
  const { collapsed, toggle } = useCollapsibleSidebar("odelhub-student-sidebar-collapsed");

  if (mode === "student" && isBareStudentPath(pathname)) {
    return <>{children}</>;
  }

  async function logout() {
    await fetch("/api/auth/student-logout", { method: "POST", credentials: "include" });
    router.replace("/student/login");
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
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">Student portal</p>
              <p className="mt-1 text-sm text-slate-500">Tuition & receipts</p>
            </div>
          ) : null}
          <div className={`flex items-center gap-1.5 ${collapsed ? "flex-col" : ""}`}>
            <DashboardNotificationBell hub="tuition" />
            <SidebarCollapseToggle collapsed={collapsed} onToggle={toggle} accent="cyan" />
          </div>
        </div>
        {!collapsed && studentProfile ? (
          <div className="mb-4 px-2">
            <WelcomeBackStrip
              name={studentProfile.name}
              role="student"
              previousLoginAt={studentProfile.previousLoginAt}
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
              accent="cyan"
            />
          ))}
          {!collapsed ? (
            <>
              <DashboardChatNavButton variant="student" />
              <DashboardGuideNavLinks guides={guides} />
            </>
          ) : (
            <Link
              href="/help"
              title="Help"
              className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-slate-400 hover:bg-white/5 hover:text-white"
            >
              ?
            </Link>
          )}
        </nav>
        {!collapsed ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="mx-2 mt-4 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-white/5 hover:text-rose-200"
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            title="Sign out"
            onClick={() => void logout()}
            className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-rose-300/80 hover:bg-white/5"
          >
            ×
          </button>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileChrome
          title="Student portal"
          subtitle="Tuition & receipts"
          accent="cyan"
          panelId="student-portal-mobile-menu"
          backHref={
            pathname === "/student" || pathname === "/my/dashboard"
              ? "/"
              : mode === "my"
                ? "/my/dashboard"
                : "/student"
          }
          backLabel={
            pathname === "/student" || pathname === "/my/dashboard" ? "Lobby" : "Dashboard"
          }
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
            {
              id: "help",
              label: "Support",
              items: [{ href: "/help", label: "Help center" }],
            },
          ]}
          afterSections={<DashboardChatNavButton variant="student" />}
          trailing={<DashboardNotificationBell hub="tuition" />}
          footer={
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-200/90 hover:bg-white/5"
            >
              Sign out
            </button>
          }
        />
        <div className="mx-auto w-full min-w-0 max-w-3xl flex-1 overflow-x-hidden px-4 py-6 md:max-w-4xl md:py-8">
          {pathname !== "/student" && pathname !== "/my/dashboard" ? (
            <div className="mb-4 hidden md:block">
              <PageBackLink href={mode === "my" ? "/my/dashboard" : "/student"} label="Dashboard" />
            </div>
          ) : (
            <div className="mb-4 hidden md:block">
              <PageBackLink href="/" label="Lobby" />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
