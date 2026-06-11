"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SCHOOL_ADMIN_LOGIN_PATH } from "@/lib/admin-auth-entry";

type Policy = {
  requireMasterApproval?: boolean;
  autoRegistrationEnabled?: boolean;
  autoGenerateAdminLogin?: boolean;
  deferEmailVerification?: boolean;
};

type Props = {
  className?: string;
  /** Full card (pay picker), single line (login), or compact (sidebar) */
  variant?: "card" | "inline" | "compact";
};

function workspaceBlurb(policy: Policy | null): string {
  const defer = policy?.deferEmailVerification === true;
  const autoReg = policy?.autoRegistrationEnabled === true;
  const autoAdmin = policy?.autoGenerateAdminLogin === true;

  if (defer && autoReg && autoAdmin) {
    return "Self-register and go straight to your workspace portal. Your school goes live on submit and you receive a password-set link for school admin sign-in.";
  }
  if (defer && autoReg) {
    return "Self-register and go straight to your workspace portal. Your school goes live on submit — confirm your email when ready, then sign in at /school/login.";
  }
  if (defer) {
    return "Self-register and track progress on your workspace portal. Confirm your email when ready; a platform master reviews your request.";
  }
  if (autoReg && autoAdmin) {
    return "Self-register to request a workspace. After email confirmation it activates automatically and you receive a password-set link for /school/login.";
  }
  if (autoReg) {
    return "Self-register to request a workspace. After email confirmation it activates automatically — sign in at /school/login when your admin account is ready.";
  }
  return "Self-register to request a workspace (pending until approved). After email confirmation a platform master reviews your request — sign in at /school/login once credentials are issued.";
}

/** Self-service tenant registration at `/admin/register`. Copy follows Master workspace policy. */
export function RequestSchoolWorkspaceCta({ className = "", variant = "card" }: Props) {
  const [policy, setPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/public/school-workspace-registration-policy");
      if (!r.ok || cancelled) return;
      const j = (await r.json()) as Policy;
      if (!cancelled) setPolicy(j);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const blurb = workspaceBlurb(policy);

  if (variant === "inline") {
    return (
      <p className={`text-center text-sm text-slate-400 ${className}`}>
        New school or institution?{" "}
        <Link href="/admin/register" className="font-medium text-cyan-300 hover:text-cyan-200 hover:underline">
          Request school workspace
        </Link>
        <span className="mt-1 block text-xs text-slate-500">{blurb}</span>
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
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{blurb}</p>
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
