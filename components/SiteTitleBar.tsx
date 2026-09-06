"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { PLATFORM_BRAND_NAME } from "@/lib/platform-brand";

function pageLabel(pathname: string, masterLogin: boolean): string {
  if (pathname === "/") return "Home";
  if (pathname === "/login") return "Log in";
  if (pathname.startsWith("/student/login")) return "Student sign in";
  if (pathname.startsWith("/student/register")) return "Student register";
  if (pathname.startsWith("/student/guest")) return "Guest student";
  if (pathname.startsWith("/student")) return "Student";
  if (pathname.startsWith("/pay/")) return "Checkout";
  if (pathname === "/pay") return "Pay";
  if (pathname.startsWith("/admin/master")) return "Manager console";
  if (pathname.startsWith("/school/workspace-status")) return "Workspace status";
  if (pathname === "/school/login") return "School admin sign in";
  if (pathname.startsWith("/admin/login")) return masterLogin ? "Master sign in" : "School admin sign in";
  if (pathname.startsWith("/admin/register")) return "Request workspace";
  if (pathname.startsWith("/admin")) return "Admin";
  return "Portal";
}

export function SiteTitleBar() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const masterLogin = pathname.startsWith("/admin/login") && searchParams.get("master") === "1";
  const label = pageLabel(pathname, masterLogin);

  return (
    <div
      role="region"
      aria-label="Page context"
      className="relative border-b border-white/10 bg-gradient-to-r from-[#070b14]/95 via-[#0a1528]/90 to-[#0c1220]/95 backdrop-blur-md"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
        <div
          className="flex min-w-0 items-baseline gap-2"
          style={{ fontFamily: "var(--font-display), var(--font-sans), sans-serif" }}
        >
          <span className="truncate bg-gradient-to-r from-cyan-200 via-white to-sky-200 bg-clip-text font-bold tracking-tight text-transparent">
            {PLATFORM_BRAND_NAME}
          </span>
          <span className="hidden text-slate-500 sm:inline" aria-hidden>
            ·
          </span>
          <span className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">{label}</span>
        </div>
        <p className="font-mono text-[10px] text-slate-500 md:text-xs">UGX · TON · MoMo</p>
      </div>
    </div>
  );
}
