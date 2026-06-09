export type UserRoleLabel =
  | "master"
  | "school_admin"
  | "student"
  | "guest";

const ROLE_LABELS: Record<UserRoleLabel, string> = {
  master: "Platform master admin",
  school_admin: "School administrator",
  student: "Student",
  guest: "Guest payer",
};

export function roleDisplayLabel(role: UserRoleLabel): string {
  return ROLE_LABELS[role];
}

export function formatLoginTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function buildWelcomeBackMessage(opts: {
  name: string;
  role: UserRoleLabel;
  previousLoginAt?: string | null;
  lastLoginAt?: string | null;
  isFirstLogin?: boolean;
}): { headline: string; subline: string } {
  const displayName = opts.name.trim() || "there";
  const headline = `Welcome back, ${displayName}`;

  if (opts.isFirstLogin || !opts.previousLoginAt) {
    return {
      headline,
      subline: `This is your first sign-in as ${roleDisplayLabel(opts.role).toLowerCase()}.`,
    };
  }

  const when = formatLoginTimestamp(opts.previousLoginAt);
  const subline = when
    ? `Last signed in ${when}.`
    : "Good to see you again.";

  return { headline, subline };
}
