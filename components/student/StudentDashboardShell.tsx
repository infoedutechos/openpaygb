"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StudentLogoutButton } from "@/components/StudentLogoutButton";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";

type MeJson = {
  student?: { organizationName: string; organizationSlug: string; name: string };
};

function navActive(pathname: string, href: string): boolean {
  if (href === "/student") return pathname === "/student";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudentDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/student/me", { credentials: "include" });
      if (!r.ok || cancelled) return;
      const j = (await r.json()) as MeJson;
      if (cancelled || !j.student) return;
      setOrgSlug(j.student.organizationSlug);
      setStudentName(j.student.name);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const payWizardHref = orgSlug ? `/pay/${encodeURIComponent(orgSlug)}` : null;

  const navItems = useMemo(() => {
    const items: { href: string; label: string }[] = [
      { href: "/my/dashboard", label: "Dashboard" },
      { href: "/student/pay", label: "Pay tuition" },
      { href: "/student", label: "Student home" },
    ];
    if (payWizardHref) items.push({ href: payWizardHref, label: "School checkout" });
    items.push({ href: "/", label: "Lobby" });
    return items;
  }, [payWizardHref]);

  return (
    <div className="flex min-h-dvh bg-[#070b14] text-slate-200">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-[#0a101f] py-6 pl-4 pr-2 md:flex">
        <div className="px-2 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">Student portal</p>
          <p className="mt-1 truncate text-sm text-slate-400" title={studentName ?? undefined}>
            {studentName ?? "Signed in"}
          </p>
        </div>
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
          <DashboardChatNavButton variant="student" />
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <StudentLogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/10 bg-[#0a101f]/80 md:hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <span className="truncate text-xs font-semibold text-cyan-200" title={studentName ?? undefined}>
              {studentName ?? "Student"}
            </span>
            <StudentLogoutButton />
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 text-[11px]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-2 py-1 ${
                  navActive(pathname, item.href)
                    ? "bg-cyan-500/15 font-medium text-cyan-100"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <DashboardChatNavButton variant="student" compact />
          </nav>
        </header>
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:py-8">{children}</div>
      </div>
    </div>
  );
}
