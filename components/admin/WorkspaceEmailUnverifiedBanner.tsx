"use client";

import Link from "next/link";
import { useAuthMe } from "@/hooks/useAuthMe";

/** Shown on school admin dashboards when the workspace contact email is not verified yet. */
export function WorkspaceEmailUnverifiedBanner() {
  const { data: authMe } = useAuthMe();
  const org = authMe?.admin?.organization;

  if (!authMe?.admin || authMe.admin.role === "master") return null;
  if (!org || org.emailVerifyStatus !== "pending") return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-500/35 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
    >
      <p className="font-semibold text-amber-50">Registration email not verified</p>
      <p className="mt-1 text-amber-100/90">
        Your school workspace contact{" "}
        <span className="font-mono text-amber-50">{org.registrationContactEmail}</span> has not been confirmed yet.
        Check your inbox for the ODEL HUB verification link (and spam folder), or request a new link from the
        registration page.
      </p>
      <p className="mt-2 text-xs text-amber-200/80">
        <Link href="/admin/register" className="underline hover:text-amber-50">
          Resend verification
        </Link>{" "}
        · Tuition checkout and admin tools remain available while you complete verification.
      </p>
    </div>
  );
}
