"use client";

import Link from "next/link";
import { OPERATOR_ALL_SIDES_LINKS } from "@/lib/access-surfaces";

/**
 * Lets developers and platform masters navigate every product side.
 * Each gated portal still requires its own audience sign-in.
 */
export function OperatorAllSidesNav({
  title = "All product sides",
  subtitle = "Developers and platform operators can open every surface. Sign in with the matching role when a portal requires it.",
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <section
      aria-labelledby="operator-all-sides-heading"
      className={
        compact
          ? "rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-3 py-3"
          : "rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-4"
      }
    >
      <h2 id="operator-all-sides-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">
        {title}
      </h2>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">{subtitle}</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {OPERATOR_ALL_SIDES_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10"
            >
              <span className="font-medium">{link.label}</span>
              {link.description ? (
                <span className="mt-0.5 block text-[11px] text-slate-500">{link.description}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
