"use client";

import { usePathname } from "next/navigation";

function pageLabel(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/student/login")) return "Student sign in";
  if (pathname.startsWith("/student/register")) return "Student register";
  if (pathname.startsWith("/student/guest")) return "Guest student";
  if (pathname.startsWith("/student")) return "Student";
  if (pathname.startsWith("/pay/")) return "Checkout";
  if (pathname === "/pay") return "Pay";
  if (pathname.startsWith("/admin/master")) return "Manager console";
  if (pathname === "/school/login" || pathname.startsWith("/admin/login")) return "School admin sign in";
  if (pathname.startsWith("/admin/register")) return "Request workspace";
  if (pathname.startsWith("/admin")) return "Admin";
  return "Portal";
}

export function SiteTitleBar() {
  const pathname = usePathname();
  const label = pageLabel(pathname || "/");

  return (
    <div
      role="region"
      aria-label="Page context"
      className="relative border-b border-ura-border/80 bg-gradient-to-r from-ura-navy/95 via-ura-blue-dark/30 to-ura-elevated/95 backdrop-blur-md"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ura-gold/35 to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
        <div
          className="flex min-w-0 items-baseline gap-2"
          style={{ fontFamily: "var(--font-display), var(--font-sans), sans-serif" }}
        >
          <span className="truncate bg-gradient-to-r from-ura-gold via-ura-white to-ura-blue bg-clip-text font-bold tracking-tight text-transparent">
            ODEL HUB Pay
          </span>
          <span className="hidden text-slate-500 sm:inline" aria-hidden>
            ·
          </span>
          <span className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-ura-gold/95">{label}</span>
        </div>
        <p className="font-mono text-[10px] text-slate-500 md:text-xs">
          UGX · TON · MoMo
        </p>
      </div>
    </div>
  );
}
