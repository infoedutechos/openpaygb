"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteHeaderMobileDrawer } from "@/components/pay/SiteHeaderMobileDrawer";
import { SiteHeaderNavDropdown } from "@/components/pay/SiteHeaderNavDropdown";
import { SITE_HEADER_MENUS, SITE_HEADER_UTILITY_LINKS } from "@/lib/ecosystem/site-nav-menus";
import { payProgrammesHref } from "@/lib/tuition-nav";

export function SiteHeader() {
  const pathname = usePathname();
  const programmesHref = payProgrammesHref(pathname);
  const [studentSignedIn, setStudentSignedIn] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const headerMenus = useMemo(
    () =>
      SITE_HEADER_MENUS.map((menu) => ({
        ...menu,
        items: menu.items.map((item) =>
          item.label === "Programmes & fees" ? { ...item, href: programmesHref } : item,
        ),
      })),
    [programmesHref],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/student/session", { credentials: "same-origin" })
      .then(async (res) => {
        if (cancelled || !res.ok) return;
        const j = (await res.json()) as { signedIn?: boolean };
        if (!cancelled) setStudentSignedIn(Boolean(j.signedIn));
      })
      .catch(() => {
        if (!cancelled) setStudentSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const studentHref = studentSignedIn ? "/my/dashboard" : "/student/login";
  const studentLabel = studentSignedIn ? "My dashboard" : "Log in";

  const utilityLinkClass = (variant: "default" | "accent" | "admin" = "default") => {
    if (variant === "accent") {
      return "shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium text-cyan-200/90 transition-colors hover:bg-cyan-500/10 hover:text-cyan-100 sm:px-2.5 sm:py-2 sm:text-sm";
    }
    if (variant === "admin") {
      return "shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-white sm:px-2.5 sm:py-2 sm:text-sm";
    }
    return "shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white sm:px-2.5 sm:py-2 sm:text-sm";
  };

  return (
    <header className="sticky top-0 z-40 overflow-visible border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      <div className="mx-auto flex max-w-[100rem] items-center gap-3 px-4 py-3">
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/90 to-sky-600 text-sm font-black text-slate-950 shadow-[0_0_24px_var(--glow)]"
            aria-hidden
          >
            OH
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
              ODEL HUB
            </span>
            <span className="truncate text-sm font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-100 sm:text-base">
              Tuition · Play · Dex
            </span>
          </span>
        </Link>

        {/* Desktop: full single-row nav */}
        <nav
          className="ml-auto hidden min-w-0 flex-1 flex-nowrap items-center justify-end gap-0.5 overflow-x-auto overflow-y-visible [-ms-overflow-style:none] [scrollbar-width:none] lg:flex lg:gap-1 [&::-webkit-scrollbar]:hidden"
          aria-label="Main"
        >
          {headerMenus.map((menu) => (
            <SiteHeaderNavDropdown key={menu.id} menu={menu} />
          ))}
          {SITE_HEADER_UTILITY_LINKS.map((item) => {
            const signedIn = Boolean(item.signedInHref && studentSignedIn);
            const href = signedIn ? item.signedInHref! : item.href;
            const label = signedIn ? item.signedInLabel! : item.label;
            return (
              <Link
                key={item.label}
                href={href}
                className={utilityLinkClass(item.variant)}
                title={item.title}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile: Atlantis-style compact actions + hamburger */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:hidden">
          <Link
            href={studentHref}
            className="whitespace-nowrap px-1.5 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:text-white sm:px-2"
          >
            {studentLabel}
          </Link>
          <Link
            href="/admin/register"
            className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-100 sm:text-sm"
            title="Self-register your school on our platform"
          >
            Sign up
          </Link>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-cyan-200 transition-colors hover:bg-cyan-500/10 hover:text-cyan-100"
          >
            {mobileOpen ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10.25Zm0 5.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <SiteHeaderMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        menus={headerMenus}
        studentSignedIn={studentSignedIn}
      />
    </header>
  );
}
