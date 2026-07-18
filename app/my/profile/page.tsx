"use client";

import Link from "next/link";
import { useStudentMe } from "@/hooks/useStudentMe";
import { profileFromStudentMe } from "@/lib/profile-mappers";
import { UserProfilePanel } from "@/components/profile/UserProfilePanel";
import { StudentPasswordSection } from "@/components/profile/StudentPasswordSection";

export default function MyProfilePage() {
  const { data, loading } = useStudentMe();
  const student = data?.student;

  if (loading) {
    return <p className="text-slate-500">Loading profile…</p>;
  }

  if (!student) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-8 text-center">
        <p className="text-slate-300">Sign in to view your profile.</p>
        <Link
          href="/student/login?next=/my/profile"
          className="mt-4 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Student sign in
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Account</p>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
      </header>
      <UserProfilePanel profile={profileFromStudentMe(student)} showWelcome />
      <StudentPasswordSection
        portalSignInEnabled={Boolean(student.portalSignInEnabled)}
        demoPasswordLocked={Boolean(student.demoPasswordLocked)}
      />
    </div>
  );
}
