"use client";

import { AdminAccountPasswordSection } from "@/components/admin/AdminAccountPasswordSection";
import { useAuthMe } from "@/hooks/useAuthMe";
import { profileFromAuthAdmin } from "@/lib/profile-mappers";
import { UserProfilePanel } from "@/components/profile/UserProfilePanel";

type Props = {
  includePassword?: boolean;
};

export function AdminUserProfileSection({ includePassword = false }: Props) {
  const { data: authMe, loading } = useAuthMe();
  const admin = authMe?.admin;

  if (loading) {
    return <p className="text-sm text-slate-500">Loading profile…</p>;
  }
  if (!admin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <UserProfilePanel profile={profileFromAuthAdmin(admin)} />
      {includePassword ? (
        <section id="password" className="scroll-mt-6">
          <AdminAccountPasswordSection successHeading="Password & security" />
        </section>
      ) : null}
    </div>
  );
}
