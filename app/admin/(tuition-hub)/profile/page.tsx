"use client";

import { EditableAdminProfileSection } from "@/components/profile/EditableAdminProfileSection";
import { OpenPayCardPanel } from "@/components/student/OpenPayCardPanel";
import Link from "next/link";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Account</p>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Edit your display name and photo, review sign-in details, and change your password.
        </p>
      </header>
      <EditableAdminProfileSection includePassword />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-violet-100">My OpenPayGB Card</h2>
          <Link href="/admin/my-card" className="text-xs text-violet-300/90 hover:underline">
            Open full card page →
          </Link>
        </div>
        <OpenPayCardPanel apiBase="/api/admin/openpay-card" showTuitionHint={false} />
      </div>
    </div>
  );
}
