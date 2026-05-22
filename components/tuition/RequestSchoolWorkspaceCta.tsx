import Link from "next/link";
import { SCHOOL_ADMIN_LOGIN_PATH } from "@/lib/admin-auth-entry";

type Props = {
  className?: string;
  /** Full card (pay picker), single line (login), or compact (sidebar) */
  variant?: "card" | "inline" | "compact";
};

/** Self-service tenant registration at `/admin/register` (pending until master approves). */
export function RequestSchoolWorkspaceCta({ className = "", variant = "card" }: Props) {
  if (variant === "inline") {
    return (
      <p className={`text-center text-sm text-slate-400 ${className}`}>
        New school or institution?{" "}
        <Link href="/admin/register" className="font-medium text-cyan-300 hover:text-cyan-200 hover:underline">
          Request school workspace
        </Link>
        <span className="mt-1 block text-xs text-slate-500">
          Login details come after platform approval — not from this form.
        </span>
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href="/admin/register"
        className={`mx-2 block rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 hover:border-cyan-400/35 hover:text-cyan-100 ${className}`}
      >
        <span className="font-medium text-cyan-200/90">Request school workspace</span>
        <span className="mt-0.5 block text-[10px] text-slate-500">Self-register on our platform</span>
      </Link>
    );
  }

  return (
    <section
      className={`rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 to-[var(--card)] p-5 text-left ${className}`}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cyan-300/90">For schools</p>
      <h2 className="mt-1 text-base font-semibold text-white">Register your school</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Self-register to request a workspace (pending until approved). The platform operator then creates your{" "}
        <strong className="font-medium text-slate-300">school admin login</strong> and shares credentials. Sign in at{" "}
        <Link href={SCHOOL_ADMIN_LOGIN_PATH} className="font-mono text-cyan-300/90 hover:underline">
          /school/login
        </Link>
        .
      </p>
      <Link
        href="/admin/register"
        className="mt-4 inline-flex flex-col items-start rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-5 py-2.5 hover:border-cyan-300/60 hover:bg-cyan-500/25"
      >
        <span className="text-sm font-semibold text-cyan-50">Request school workspace</span>
        <span className="mt-0.5 text-xs font-normal text-cyan-200/80">Self-register on our platform</span>
      </Link>
    </section>
  );
}
