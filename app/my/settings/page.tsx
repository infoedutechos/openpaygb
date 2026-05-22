"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";

type Me = {
  student: {
    portalSignInEnabled?: boolean;
  };
};

export default function MySettingsPage() {
  const [portalSignInEnabled, setPortalSignInEnabled] = useState<boolean | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/student/me", { credentials: "include" });
      if (r.status === 401) {
        setSignedOut(true);
        return;
      }
      const j = (await r.json()) as Me;
      setPortalSignInEnabled(Boolean(j.student?.portalSignInEnabled));
    })();
  }, []);

  if (signedOut) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-8 text-center">
        <p className="text-slate-300">Sign in to manage your password.</p>
        <Link
          href="/student/login?next=/my/settings"
          className="mt-4 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Student sign in
        </Link>
      </div>
    );
  }

  if (portalSignInEnabled === null) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-white/10 pb-4">
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Student portal</p>
        <h1 className="text-2xl font-semibold text-white">Password &amp; security</h1>
        <p className="mt-1 text-sm text-slate-400">Update the password you use for the student portal.</p>
      </header>
      <ChangePasswordCard
        action="/api/auth/student/change-password"
        canChange={portalSignInEnabled}
        disabledMessage="Your school has not enabled portal passwords on this account yet. Use registration that sets a password, or ask your admin to enable portal sign-in."
      />
      <p className="text-xs text-slate-500">
        <Link href="/my/dashboard" className="text-cyan-400 hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
