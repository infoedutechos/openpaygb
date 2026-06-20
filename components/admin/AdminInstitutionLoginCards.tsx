"use client";

import Link from "next/link";
import {
  adminLoginPathForMode,
  type AdminLoginMode,
} from "@/lib/admin-auth-entry";
import {
  registrationSegmentSubtitle,
  registrationSegmentTitle,
} from "@/lib/institution-tier";

type CardDef = {
  mode: AdminLoginMode;
  title: string;
  subtitle: string;
  border: string;
  bg: string;
  titleClass: string;
  activeRing: string;
};

const INSTITUTION_CARDS: CardDef[] = [
  {
    mode: "higher",
    title: registrationSegmentTitle("higher"),
    subtitle: registrationSegmentSubtitle("higher"),
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/25",
    titleClass: "text-cyan-300/95",
    activeRing: "ring-2 ring-cyan-400/60",
  },
  {
    mode: "schools",
    title: registrationSegmentTitle("schools"),
    subtitle: registrationSegmentSubtitle("schools"),
    border: "border-sky-500/30",
    bg: "bg-sky-950/20",
    titleClass: "text-sky-300/95",
    activeRing: "ring-2 ring-sky-400/60",
  },
];

const MASTER_CARD: CardDef = {
  mode: "master",
  title: "Platform Master",
  subtitle: "ODEL HUB platform operator",
  border: "border-amber-500/35",
  bg: "bg-amber-950/20",
  titleClass: "text-amber-300/95",
  activeRing: "ring-2 ring-amber-400/60",
};

function LoginCard({
  card,
  active,
  onSelect,
}: {
  card: CardDef;
  active: boolean;
  onSelect?: (mode: AdminLoginMode) => void;
}) {
  const href = adminLoginPathForMode(card.mode);
  const className = `block rounded-2xl border ${card.border} ${card.bg} p-5 text-left shadow-lg shadow-black/20 transition-all hover:brightness-105 ${
    active ? card.activeRing : "hover:border-white/20"
  }`;

  const inner = (
    <>
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${card.titleClass}`}>{card.title}</p>
      <p className="mt-1 text-sm font-medium text-slate-300">{card.subtitle}</p>
      {active ? (
        <p className="mt-3 text-xs font-semibold text-emerald-300/90">Selected — sign in below</p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Sign in →</p>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(card.mode)} className={`w-full ${className}`}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export function AdminInstitutionLoginCards({
  activeMode,
  onSelect,
}: {
  activeMode: AdminLoginMode;
  onSelect?: (mode: AdminLoginMode) => void;
}) {
  const resolvedMode = activeMode === "default" ? null : activeMode;

  return (
    <section aria-labelledby="admin-login-cards-heading" className="space-y-4">
      <div className="text-center">
        <h2 id="admin-login-cards-heading" className="text-sm font-semibold text-slate-300">
          Choose your sign-in
        </h2>
        <p className="mt-1 text-xs text-slate-500">Institution admins and platform master use separate workspaces.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {INSTITUTION_CARDS.map((card) => (
          <LoginCard
            key={card.mode}
            card={card}
            active={resolvedMode === card.mode}
            onSelect={onSelect}
          />
        ))}
      </div>
      <LoginCard
        card={MASTER_CARD}
        active={resolvedMode === "master"}
        onSelect={onSelect}
      />
    </section>
  );
}

