"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { OdelShieldIcon } from "@/components/icons/OdelShieldIcon";
import { AdminWorkspaceBar } from "@/components/admin/AdminWorkspaceBar";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { invalidateAuthMeCache, useAuthMe } from "@/hooks/useAuthMe";
import { DbDegradedBanner } from "@/components/admin/DbDegradedBanner";
import { WorkspaceEmailUnverifiedBanner } from "@/components/admin/WorkspaceEmailUnverifiedBanner";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { adminRoleToProfileRole } from "@/lib/profile-mappers";
import { DEX_SIDEBAR_NAV, pathnameIsDexHub } from "@/lib/dex-nav";

const SEGMENTS: { suffix: string; label: string }[] = [
  { suffix: "", label: "Dashboard" },
  { suffix: "/profile", label: "Profile" },
  { suffix: "/tuition-balance", label: "Tuition balance" },
  { suffix: "/students", label: "Students" },
  { suffix: "/payments", label: "Payments" },
  { suffix: "/payment-requests", label: "Payment requests" },
  { suffix: "/virtual-cards", label: "Virtual cards" },
  { suffix: "/programmes", label: "Programs" },
  { suffix: "/receipts", label: "Receipts" },
  { suffix: "/reports", label: "Reports" },
  { suffix: "/users", label: "Users" },
  { suffix: "/settings", label: "Settings" },
];

function navActive(pathname: string, href: string): boolean {
  if (href === DEX_SIDEBAR_NAV.href) return pathnameIsDexHub(pathname);
  if (href.endsWith("/admin") || href.endsWith("/school-admin")) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TuitionAdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hrefWithOrgSlug } = useMasterOrgSlug();
  const base = pathname.startsWith("/school-admin") ? "/school-admin" : "/admin";
  const navItems = useMemo(
    () => [
      ...SEGMENTS.map((s) => ({ href: hrefWithOrgSlug(`${base}${s.suffix}`), label: s.label })),
      DEX_SIDEBAR_NAV,
    ],
    [base, hrefWithOrgSlug]
  );
  const { data: authMe } = useAuthMe();
  const isMaster = authMe?.admin?.role === "master";
  const schoolName = authMe?.admin?.organization?.name?.trim() || null;
  const isSchoolAdmin = authMe?.admin?.role === "org_admin" && Boolean(schoolName);
  const tenantLabel = !authMe?.admin
    ? authMe?.adminShellAccess
      ? "Tuition sign-in pending"
      : "Admin"
    : schoolName ?? (authMe.admin.role === "master" ? "Platform overview" : "Admin");
  const shellTitle = isSchoolAdmin ? schoolName! : "ODEL HUB";
  const shellSubtitle = isSchoolAdmin ? "School dashboard" : tenantLabel;
  const adminWelcomeName =
    authMe?.admin?.name?.trim() || authMe?.admin?.email?.trim() || null;
  const adminWelcomeRole = authMe?.admin ? adminRoleToProfileRole(authMe.admin.role) : null;

  async function logout() {
    invalidateAuthMeCache();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    const next = pathname.startsWith("/school-admin") ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`${PUBLIC_SCHOOL_LOGIN_PATH}${next}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-1px)] bg-[#070d18] text-slate-200">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-[#0a101f] py-6 pl-4 pr-2 text-slate-200 md:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-100">
            <OdelShieldIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide text-white">ODEL HUB</p>
            <p className="truncate text-xs text-slate-400" title={tenantLabel}>
              {tenantLabel}
            </p>
          </div>
        </div>
        {adminWelcomeName && adminWelcomeRole ? (
          <div className="mb-4 px-2">
            <WelcomeBackStrip
              name={adminWelcomeName}
              role={adminWelcomeRole}
              previousLoginAt={authMe?.admin?.previousLoginAt}
            />
          </div>
        ) : null}
        <nav className="flex flex-1 flex-col gap-0.5 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 transition-colors ${
                navActive(pathname, item.href)
                  ? "bg-cyan-500/15 font-medium text-cyan-100"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <DashboardChatNavButton variant="tuition" />
        </nav>
        {isMaster ? (
          <Link
            href="/admin/master"
            className="mx-2 mt-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-100 hover:border-amber-400/60"
          >
            Manager console
          </Link>
        ) : null}
        <RequestSchoolWorkspaceCta variant="compact" className="mt-3" />
        <button
          type="button"
          onClick={() => void logout()}
          className="mx-2 mt-4 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-white/5 hover:text-rose-200"
        >
          Logout
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/10 bg-[#0a101f] md:hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white" title={shellTitle}>
                {shellTitle}
              </p>
              <p className="truncate text-[10px] text-slate-500" title={shellSubtitle}>
                {shellSubtitle}
              </p>
            </div>
            <div className="flex shrink-0 gap-3 text-[11px]">
              {isMaster ? (
                <Link href="/admin/master" className="text-amber-400/90">
                  Manager
                </Link>
              ) : null}
              <button type="button" onClick={() => void logout()} className="text-slate-500 hover:text-rose-200">
                Out
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 text-[11px]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-2 py-2 min-h-[44px] inline-flex items-center transition-colors ${
                  navActive(pathname, item.href)
                    ? "bg-cyan-500/15 font-medium text-cyan-100"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <DashboardChatNavButton variant="tuition" compact />
          </nav>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">
          <AdminWorkspaceBar />
          {authMe?.dbDegraded ? <DbDegradedBanner /> : null}
          <WorkspaceEmailUnverifiedBanner />
          {children}
        </div>
      </div>
    </div>
  );
}

export default function TuitionAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-[#070d18]" />}>
      <TuitionAdminShellInner>{children}</TuitionAdminShellInner>
    </Suspense>
  );
}
