"use client";

import { Component, type ReactNode, Suspense } from "react";
import Link from "next/link";
import { EditableAdminProfileSection } from "@/components/profile/EditableAdminProfileSection";
import { OpenPayCardPanel } from "@/components/student/OpenPayCardPanel";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";

class CardPanelErrorBoundary extends Component<
  { children: ReactNode; fallbackHref: string },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(err: Error) {
    return { error: err.message || "Card panel failed to load" };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
          <p>OpenPayGB card panel could not render here ({this.state.error}).</p>
          <Link href={this.props.fallbackHref} className="mt-2 inline-block text-violet-300 underline">
            Open full card page →
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminProfileInner() {
  const { orgSlug, hrefWithOrgSlug } = useMasterOrgSlug();
  const cardHref = hrefWithOrgSlug("/admin/my-card");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Account</p>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Edit your display name and photo, review sign-in details, change your password, and manage your OpenPayGB
          card. Also linked from Master console and Tuition / School admin sidebars.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href={cardHref} className="rounded-lg border border-violet-400/40 px-3 py-1.5 text-violet-200">
            My OpenPayGB Card
          </Link>
          <Link href="/dex/p2p" className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-300">
            P2P market
          </Link>
        </div>
      </header>
      <EditableAdminProfileSection includePassword />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-violet-100">My OpenPayGB Card</h2>
          <Link href={cardHref} className="text-xs text-violet-300/90 hover:underline">
            Open full card page →
          </Link>
        </div>
        <CardPanelErrorBoundary fallbackHref={cardHref}>
          <OpenPayCardPanel
            apiBase="/api/admin/openpay-card"
            showTuitionHint={false}
            organizationSlug={orgSlug || null}
          />
        </CardPanelErrorBoundary>
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading profile…</p>}>
      <AdminProfileInner />
    </Suspense>
  );
}
