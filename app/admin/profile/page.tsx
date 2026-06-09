"use client";

import { AdminUserProfileSection } from "@/components/profile/AdminUserProfileSection";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Account</p>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Your sign-in details, last login, and password.</p>
      </header>
      <AdminUserProfileSection includePassword />
    </div>
  );
}
