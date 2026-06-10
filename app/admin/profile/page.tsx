"use client";

import { EditableAdminProfileSection } from "@/components/profile/EditableAdminProfileSection";

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
    </div>
  );
}
