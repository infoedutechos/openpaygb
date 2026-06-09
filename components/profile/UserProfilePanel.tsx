"use client";

import { buildWelcomeBackMessage, formatLoginTimestamp, roleDisplayLabel, type UserRoleLabel } from "@/lib/welcome-back";

export type UserProfileData = {
  role: UserRoleLabel;
  name: string;
  email?: string | null;
  phone?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  programmeCode?: string | null;
  year?: number | null;
  semester?: number | null;
  accountId?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  previousLoginAt?: string | null;
  signInMethod?: string | null;
  extra?: Array<{ label: string; value: string }>;
};

type Props = {
  profile: UserProfileData;
  variant?: "dark" | "light";
  showWelcome?: boolean;
};

function Row({ label, value, variant }: { label: string; value: string; variant: "dark" | "light" }) {
  const labelCls = variant === "light" ? "text-slate-500" : "text-slate-500";
  const valueCls = variant === "light" ? "text-slate-900" : "text-slate-200";
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className={`text-xs font-medium uppercase tracking-wide ${labelCls}`}>{label}</dt>
      <dd className={`text-sm ${valueCls}`}>{value}</dd>
    </div>
  );
}

export function UserProfilePanel({ profile, variant = "dark", showWelcome = true }: Props) {
  const welcome = buildWelcomeBackMessage({
    name: profile.name,
    role: profile.role,
    previousLoginAt: profile.previousLoginAt,
    lastLoginAt: profile.lastLoginAt,
    isFirstLogin: !profile.previousLoginAt,
  });

  const shell =
    variant === "light"
      ? "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      : "rounded-xl border border-white/10 bg-[#0d1526]/80 p-5";

  const headlineCls = variant === "light" ? "text-slate-900" : "text-white";
  const subCls = variant === "light" ? "text-slate-600" : "text-slate-400";

  return (
    <section className={shell}>
      {showWelcome ? (
        <header
          className={`pb-4 mb-4 border-b ${variant === "light" ? "border-slate-200" : "border-white/10"}`}
        >
          <p className={`text-lg font-semibold ${headlineCls}`}>{welcome.headline}</p>
          <p className={`mt-1 text-sm ${subCls}`}>{welcome.subline}</p>
        </header>
      ) : null}

      <h2 className={`text-xs font-bold uppercase tracking-wider ${subCls}`}>Your profile</h2>
      <dl className="mt-3 space-y-3">
        <Row label="Role" value={roleDisplayLabel(profile.role)} variant={variant} />
        {profile.email ? <Row label="Email" value={profile.email} variant={variant} /> : null}
        {profile.phone ? <Row label="Phone" value={profile.phone} variant={variant} /> : null}
        {profile.organizationName ? (
          <Row
            label="School"
            value={
              profile.organizationSlug
                ? `${profile.organizationName} (${profile.organizationSlug})`
                : profile.organizationName
            }
            variant={variant}
          />
        ) : null}
        {profile.programmeCode ? (
          <Row
            label="Programme"
            value={`${profile.programmeCode}${profile.year != null ? ` · Year ${profile.year}` : ""}${profile.semester != null ? ` · Semester ${profile.semester}` : ""}`}
            variant={variant}
          />
        ) : null}
        {profile.signInMethod ? <Row label="Sign-in" value={profile.signInMethod} variant={variant} /> : null}
        {profile.createdAt ? (
          <Row label="Account since" value={formatLoginTimestamp(profile.createdAt) ?? profile.createdAt} variant={variant} />
        ) : null}
        {profile.lastLoginAt ? (
          <Row label="This sign-in" value={formatLoginTimestamp(profile.lastLoginAt) ?? profile.lastLoginAt} variant={variant} />
        ) : null}
        {profile.previousLoginAt ? (
          <Row
            label="Previous sign-in"
            value={formatLoginTimestamp(profile.previousLoginAt) ?? profile.previousLoginAt}
            variant={variant}
          />
        ) : null}
        {profile.extra?.map((row) => (
          <Row key={row.label} label={row.label} value={row.value} variant={variant} />
        ))}
      </dl>
    </section>
  );
}
