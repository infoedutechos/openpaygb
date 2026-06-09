"use client";

import { ChangePasswordCard } from "@/components/ChangePasswordCard";

type Props = {
  portalSignInEnabled: boolean;
};

export function StudentPasswordSection({ portalSignInEnabled }: Props) {
  return (
    <section id="password" className="scroll-mt-6 space-y-3 rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
      <header>
        <h2 className="text-sm font-semibold text-white">Password &amp; security</h2>
        <p className="mt-1 text-xs text-slate-400">Update the password you use for the student portal.</p>
      </header>
      <ChangePasswordCard
        action="/api/auth/student/change-password"
        canChange={portalSignInEnabled}
        disabledMessage="Your school has not enabled portal passwords on this account yet. Use registration that sets a password, or ask your admin to enable portal sign-in."
      />
    </section>
  );
}
