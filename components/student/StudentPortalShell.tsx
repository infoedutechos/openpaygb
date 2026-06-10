"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { useStudentMe } from "@/hooks/useStudentMe";
import { profileFromStudentMe } from "@/lib/profile-mappers";

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
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV: { href: string; label: string }[] = [
  { href: "/my/dashboard", label: "Dashboard" },
  { href: "/my/profile", label: "Profile" },
  { href: "/student/balance", label: "Tuition balance" },
  { href: "/my/receipts", label: "Receipts & history" },
  { href: "/student/pay", label: "Pay tuition" },
  { href: "/student/card", label: "Virtual card" },
  { href: "/student", label: "Student home" },
  { href: "/", label: "Lobby" },
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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-[#0a101f] py-6 pl-4 pr-2 md:flex">
        <div className="space-y-3 px-2 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">Student portal</p>
            <p className="mt-1 text-sm text-slate-500">Tuition & receipts</p>
          </div>
          {studentProfile ? (
            <WelcomeBackStrip
              name={studentProfile.name}
              role="student"
              previousLoginAt={studentProfile.previousLoginAt}
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
                  ? "bg-cyan-500/15 font-medium text-cyan-100"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <DashboardChatNavButton variant="student" />
        </nav>
        <button
          type="button"
          onClick={() => void logout()}
          className="mx-2 mt-4 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-white/5 hover:text-rose-200"
        >
          Sign out
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/10 bg-[#0a101f]/90 md:hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <span className="text-xs font-semibold text-cyan-200">Student portal</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="shrink-0 text-xs text-slate-500 hover:text-rose-200"
            >
              Sign out
            </button>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 text-[11px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[44px] shrink-0 items-center rounded-lg px-3 py-2 ${
                  navActive(pathname, item.href)
                    ? "bg-cyan-500/15 font-semibold text-cyan-200"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <DashboardChatNavButton variant="student" compact />
          </nav>
        </header>
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:max-w-4xl md:py-8">{children}</div>
      </div>
    </div>
  );
}
