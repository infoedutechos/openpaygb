"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { useAuthMe } from "@/hooks/useAuthMe";

const nav: { href: string; label: string; desc?: string }[] = [
  { href: "/admin/master", label: "Overview", desc: "Platform totals" },
  {
    href: "/admin/master/organizations",
    label: "Organizations",
    desc: "Tenants, favicons, per-school fee",
  },
  {
    href: "/admin/master/programmes",
    label: "Programmes",
    desc: "Years & semesters per year",
  },
  {
    href: "/admin/master/tuition-balance",
    label: "Tuition balance",
    desc: "Paid & remaining by student",
  },
  {
    href: "/admin/master#project-download",
    label: "Docs & downloads",
    desc: "Project description & user guides",
  },
  {
    href: "/admin/master#openpay-cards-overview",
    label: "Virtual cards",
    desc: "OpenPayGB registry",
  },
  {
    href: "/admin/master#platform-communications",
    label: "Chat & notifications",
    desc: "Bell + ODEL HUB Copilot",
  },
  {
    href: "/admin/master#knowledge-base",
    label: "Knowledge base",
    desc: "Copilot articles",
  },
  {
    href: "/admin/master#platform-social",
    label: "Social & share",
    desc: "Links, support, share copy",
  },
  {
    href: "/admin/master#system-backup",
    label: "Backup",
    desc: "Live JSON export",
  },
  {
    href: "/admin/master#deployment-environment",
    label: "Environment",
    desc: "Deployment env audit",
  },
  {
    href: "/admin/master#payment-providers",
    label: "Payment providers",
    desc: "PSP APIs & toggles",
  },
  {
    href: "/admin/master#mobile-money-providers",
    label: "Mobile money",
    desc: "Custom PSP webhooks",
  },
  {
    href: "/admin/master#partner-integrations",
    label: "Partner API",
    desc: "Keys & webhooks out",
  },
  {
    href: "/docs",
    label: "Documentation",
    desc: "Searchable docs library",
  },
];

function navActive(pathname: string, href: string): boolean {
  if (href === "/admin/master") return pathname === "/admin/master";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MasterManagerShell({
  children,
  dbUnavailable = false,
}: {
  children: React.ReactNode;
  dbUnavailable?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: authMe } = useAuthMe();
  const adminWelcomeName =
    authMe?.admin?.name?.trim() || authMe?.admin?.email?.trim() || null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-1px)] flex-col bg-[#08070a] text-slate-200">
      {dbUnavailable ? (
        <div
          role="status"
          className="border-b border-amber-500/30 bg-amber-950/50 px-4 py-2 text-center text-xs text-amber-100"
        >
          Database is temporarily unreachable (MongoDB Atlas). Retry in a few seconds or check your network / IP
          allowlist. Pages may load with limited data until the connection recovers.
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-amber-500/15 bg-gradient-to-b from-[#15100c] to-[#0a0806] py-6 pl-4 pr-2 md:flex">
        <div className="space-y-3 px-2 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">Master</p>
            <p className="mt-1 text-sm font-medium text-white">Manager console</p>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">ODEL HUB platform</p>
          </div>
          {adminWelcomeName ? (
            <WelcomeBackStrip
              name={adminWelcomeName}
              role="master"
              previousLoginAt={authMe?.admin?.previousLoginAt}
              className="border-amber-500/20 bg-amber-950/20"
            />
          ) : null}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 transition-colors ${
                navActive(pathname, item.href)
                  ? "bg-amber-500/15 font-medium text-amber-100 ring-1 ring-amber-500/25"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {item.label}
              {item.desc ? <span className="block text-[11px] font-normal text-slate-600">{item.desc}</span> : null}
            </Link>
          ))}
          <DashboardChatNavButton variant="master" />
        </nav>

        <div className="mt-6 space-y-1 border-t border-amber-500/10 px-2 pt-4">
          <p className="px-3 text-[10px] uppercase tracking-wider text-slate-600">Operations</p>
          <Link
            href="/admin/profile"
            className="block rounded-lg px-3 py-2 text-sm text-amber-200/85 hover:bg-amber-950/35 hover:text-amber-50"
          >
            Profile
            <span className="block text-[11px] text-slate-600">Account &amp; password</span>
          </Link>
          <Link
            href="/admin"
            className="block rounded-lg px-3 py-2 text-sm text-cyan-200/80 hover:bg-cyan-950/40 hover:text-cyan-100"
          >
            Tuition hub
            <span className="block text-[11px] text-slate-600">School admin view</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="mx-2 mt-4 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-white/[0.04] hover:text-rose-200"
        >
          Logout
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-[#100c0a]/80 to-transparent">
        <header className="border-b border-amber-500/10 md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">Master</p>
              <p className="text-sm text-white">Manager</p>
            </div>
            <div className="flex shrink-0 gap-3 text-[11px]">
              <Link href="/admin/profile" className="text-amber-400/90">
                Profile
              </Link>
              <Link href="/admin" className="text-cyan-400/80">
                Tuition
              </Link>
              <button type="button" onClick={() => void logout()} className="text-slate-600">
                Out
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 text-[11px] text-slate-400">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-2 py-2 min-h-[44px] inline-flex items-center transition-colors ${
                  navActive(pathname, item.href)
                    ? "bg-amber-500/15 font-medium text-amber-100"
                    : "hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <DashboardChatNavButton variant="master" compact />
          </nav>
        </header>
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">{children}</div>
      </div>
      </div>
    </div>
  );
}
