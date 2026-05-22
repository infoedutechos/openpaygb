"use client";

import Link from "next/link";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { useAuthMe } from "@/hooks/useAuthMe";

/**
 * Tuition hub JWT (`odelhub_admin`) + `AdminUser` row: change password for org admin, school admin, or master.
 */
export function AdminAccountPasswordSection({
  absentTitle = "Tuition admin password",
  absentHint,
  successHeading,
}: {
  absentTitle?: string;
  absentHint?: string;
  /** When session is valid, optional heading above the card (e.g. on dashboards). */
  successHeading?: string;
}) {
  const { data: authMe, loading } = useAuthMe();
  const gate = loading ? "loading" : authMe?.tuitionSession ? "yes" : "no";

  if (gate === "loading") {
    return <p className="text-xs text-slate-500">Checking session…</p>;
  }

  if (gate === "no") {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
        <h2 className="text-sm font-semibold text-white">{absentTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">
          {absentHint ??
            "Password changes use your ODEL HUB tuition admin email and password. If you only have another admin session in this browser, open Admin login and sign in with your tuition account."}{" "}
          <Link href="/admin/login" className="text-cyan-400 underline">
            Admin login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {successHeading ? <h2 className="text-sm font-semibold text-white">{successHeading}</h2> : null}
      <ChangePasswordCard action="/api/auth/admin/change-password" />
    </div>
  );
}
