"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteHeaderNavDropdown } from "@/components/pay/SiteHeaderNavDropdown";
import { SITE_HEADER_MENUS } from "@/lib/ecosystem/site-nav-menus";
import { payProgrammesHref } from "@/lib/tuition-nav";

export function SiteHeader() {
  const pathname = usePathname();
  const programmesHref = payProgrammesHref(pathname);
  const [studentSignedIn, setStudentSignedIn] = useState<boolean | null>(null);

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

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5">
        <Link href="/" className="group flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
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
            <span className="truncate text-base font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-100">
              Tuition · Play · Dex
            </span>
          </span>
        </Link>
        <nav
          className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:justify-normal sm:gap-2"
          aria-label="Main"
        >
          {headerMenus.map((menu) => (
            <SiteHeaderNavDropdown key={menu.id} menu={menu} />
          ))}
          <Link
            href="/pay"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            title="Choose your school, then pay tuition"
          >
            Pay tuition
          </Link>
          <Link
            href="/admin/register"
            className="rounded-lg px-3 py-2 text-sm font-medium text-cyan-200/90 transition-colors hover:bg-cyan-500/10 hover:text-cyan-100"
            title="Self-register your school on our platform"
          >
            Register school
          </Link>
          {studentSignedIn ? (
            <Link
              href="/my/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              My dashboard
            </Link>
          ) : (
            <Link
              href="/student/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Student portal
            </Link>
          )}
          <Link
            href="/dex"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Dex Hub
          </Link>
          <Link
            href="/clicker"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Play Hub
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
