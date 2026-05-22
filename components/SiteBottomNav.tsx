"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  adminDashboardHref,
  pathnameIsUnderAdminDashboard,
  type SignedAdminSnapshot,
} from "@/lib/admin-dashboard";
import { useAuthMe } from "@/hooks/useAuthMe";

/** Who is viewing the shell — from `/api/auth/me`. */
type ShellRole = "loading" | "anon" | "master" | "org_admin";

function shellToAdmin(shell: ShellRole): SignedAdminSnapshot | null {
  if (shell === "master") return { role: "master" };
  if (shell === "org_admin") return { role: "org_admin" };
  return null;
}

type NavPiece =
  | {
      kind: "link";
      href: string;
      label: string;
      icon: (active: boolean) => ReactNode;
    }
  | {
      kind: "dashboard";
      label: string;
      icon: (active: boolean, masterAccent: boolean) => ReactNode;
    };

const NAV_PIECES: NavPiece[] = [
  {
    kind: "link",
    href: "/",
    label: "Home",
    icon: (a) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className={
          a
            ? "h-6 w-6 text-ura-blue drop-shadow-[0_0_10px_rgba(95,168,255,0.55)]"
            : "h-6 w-6"
        }
        aria-hidden
      >
        <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    kind: "link",
    href: "/pay/default",
    label: "Pay",
    icon: (a) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className={
          a
            ? "h-6 w-6 text-ura-gold drop-shadow-[0_0_10px_rgba(243,186,47,0.6)]"
            : "h-6 w-6"
        }
        aria-hidden
      >
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M2 11h20" />
      </svg>
    ),
  },
  {
    kind: "link",
    href: "/student",
    label: "Me",
    icon: (a) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className={
          a
            ? "h-6 w-6 text-ura-blue drop-shadow-[0_0_10px_rgba(95,168,255,0.55)]"
            : "h-6 w-6"
        }
        aria-hidden
      >
        <circle cx="12" cy="8.5" r="3.25" />
        <path d="M5 20v-2a7 7 0 0114 0v2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    kind: "link",
    href: "/admin/register",
    label: "Workspace",
    icon: (a) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className={
          a
            ? "h-6 w-6 text-ura-blue drop-shadow-[0_0_10px_rgba(95,168,255,0.55)]"
            : "h-6 w-6"
        }
        aria-hidden
      >
        <path d="M4 20V10l8-5 8 5v10M9 20v-6h6v6" strokeLinejoin="round" />
        <path d="M4 10h16" />
      </svg>
    ),
  },
  {
    kind: "dashboard",
    label: "Dashboard",
    icon: (a, masterAccent) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className={
          a
            ? masterAccent
              ? "h-6 w-6 text-ura-gold drop-shadow-[0_0_10px_rgba(243,186,47,0.65)]"
              : "h-6 w-6 text-ura-blue drop-shadow-[0_0_10px_rgba(95,168,255,0.55)]"
            : "h-6 w-6"
        }
        aria-hidden
      >
        <path d="M12 2 4 6v6c0 6 8 10 8 10s8-4 8-10V6l-8-4Z" />
      </svg>
    ),
  },
];

function navPieceActive(pathname: string, piece: NavPiece, shell: ShellRole): boolean {
  if (piece.kind === "dashboard") {
    return pathnameIsUnderAdminDashboard(pathname, shellToAdmin(shell));
  }
  const { href } = piece;
  if (href === "/") return pathname === "/";
  if (href === "/pay/default") return pathname.startsWith("/pay");
  if (href === "/student")
    return (
      pathname.startsWith("/student") &&
      !pathname.startsWith("/student/login") &&
      !pathname.startsWith("/student/register")
    );
  if (href === "/admin/register") return pathname.startsWith("/admin/register");
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteBottomNav() {
  const pathname = usePathname() || "/";
  const { data: authMe, loading } = useAuthMe();
  const shellRole: ShellRole = useMemo(() => {
    if (loading) return "loading";
    if (!authMe?.tuitionSession || !authMe.admin) return "anon";
    return authMe.admin.role === "master" ? "master" : "org_admin";
  }, [authMe, loading]);

  const dashboardHref = adminDashboardHref(shellToAdmin(shellRole));
  const masterAccent = shellRole === "master";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-ura-border/90 bg-ura-navy/85 shadow-[0_-4px_40px_rgba(0,0,0,0.55),0_0_28px_-8px_rgba(95,168,255,0.12)] backdrop-blur-2xl print:hidden"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        fontFamily: "var(--font-display), var(--font-sans), system-ui, sans-serif",
      }}
      aria-label="Bottom navigation"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ura-gold/45 to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex max-w-2xl items-stretch justify-between gap-0.5 px-1 pt-2 sm:gap-1 sm:px-3">
        {NAV_PIECES.map((piece) => {
          const href = piece.kind === "dashboard" ? dashboardHref : piece.href;
          const active = navPieceActive(pathname, piece, shellRole);
          const useAmberActive = piece.kind === "dashboard" && masterAccent && active;

          return (
            <Link
              key={piece.kind === "dashboard" ? "dashboard" : piece.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 sm:gap-1 sm:py-2.5 sm:text-[11px]",
                active
                  ? useAmberActive
                    ? "border border-ura-gold/45 bg-gradient-to-b from-ura-gold/18 to-ura-navy/90 text-ura-gold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_22px_-4px_rgba(243,186,47,0.32)]"
                    : "border border-ura-blue/40 bg-gradient-to-b from-ura-blue/20 to-ura-blue-dark/25 text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_0_24px_-4px_rgba(95,168,255,0.28)]"
                  : "border border-transparent text-slate-500 hover:border-ura-border/50 hover:bg-white/5 hover:text-slate-300",
              ].join(" ")}
            >
              <span className="flex h-7 w-7 items-center justify-center text-current sm:h-8 sm:w-8">
                {piece.kind === "dashboard"
                  ? piece.icon(active, masterAccent)
                  : piece.icon(active)}
              </span>
              <span className="truncate px-0.5">{piece.label}</span>
              {active ? (
                <span
                  className={`absolute bottom-1 h-0.5 w-8 rounded-full ${useAmberActive ? "progress-gradient shadow-[0_0_12px_rgba(243,186,47,0.55)]" : "bg-gradient-to-r from-ura-blue to-ura-gold shadow-[0_0_12px_rgba(95,168,255,0.45)]"}`}
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
