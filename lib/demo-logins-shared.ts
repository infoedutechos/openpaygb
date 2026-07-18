export const DEMO_LOGIN_SLOT_KEYS = [
  "master",
  "university_admin",
  "university_student",
  "school_admin",
  "school_student",
] as const;

export type DemoLoginSlotKey = (typeof DEMO_LOGIN_SLOT_KEYS)[number];

export type DemoLoginAudience = "platform" | "university" | "school";

export type DemoLoginSlotMeta = {
  key: DemoLoginSlotKey;
  label: string;
  kind: "admin" | "student";
  role?: "master" | "org_admin";
  audience: DemoLoginAudience;
  orgSlug: string | null;
  loginPath: string;
  defaultEmail: string;
  defaultName: string;
  /** When true, slot appears on public lobbies / login hints by default. */
  defaultPublishPublic: boolean;
  seedEmailEnv?: string;
  seedPasswordEnv?: string;
};

export const DEMO_LOGIN_SLOT_META: Record<DemoLoginSlotKey, DemoLoginSlotMeta> = {
  master: {
    key: "master",
    label: "Platform master",
    kind: "admin",
    role: "master",
    audience: "platform",
    orgSlug: null,
    loginPath: "/admin/login?master=1",
    defaultEmail: "master@odelhub.local",
    defaultName: "Platform Master",
    defaultPublishPublic: false,
    seedEmailEnv: "SEED_MASTER_EMAIL",
    seedPasswordEnv: "SEED_MASTER_PASSWORD",
  },
  university_admin: {
    key: "university_admin",
    label: "University org admin",
    kind: "admin",
    role: "org_admin",
    audience: "university",
    orgSlug: "default",
    loginPath: "/school/login",
    defaultEmail: "admin@odelhub.local",
    defaultName: "School Admin",
    defaultPublishPublic: true,
    seedEmailEnv: "SEED_ADMIN_EMAIL",
    seedPasswordEnv: "SEED_ADMIN_PASSWORD",
  },
  university_student: {
    key: "university_student",
    label: "University demo student",
    kind: "student",
    audience: "university",
    orgSlug: "default",
    loginPath: "/student/login",
    defaultEmail: "student@odelhub.local",
    defaultName: "Nabiddo Rehema Mbuga",
    defaultPublishPublic: true,
    seedEmailEnv: "SEED_STUDENT_EMAIL",
    seedPasswordEnv: "SEED_STUDENT_PASSWORD",
  },
  school_admin: {
    key: "school_admin",
    label: "Riverside school admin",
    kind: "admin",
    role: "org_admin",
    audience: "school",
    orgSlug: "riverside-demo",
    loginPath: "/school/login",
    defaultEmail: "school.admin@odelhub.local",
    defaultName: "Riverside School Admin",
    defaultPublishPublic: true,
    seedEmailEnv: "SEED_SCHOOL_ADMIN_EMAIL",
    seedPasswordEnv: "SEED_ADMIN_PASSWORD",
  },
  school_student: {
    key: "school_student",
    label: "Riverside school student",
    kind: "student",
    audience: "school",
    orgSlug: "riverside-demo",
    loginPath: "/student/login",
    defaultEmail: "school.student@odelhub.local",
    defaultName: "Amina Okello (demo)",
    defaultPublishPublic: true,
    seedEmailEnv: "SEED_SCHOOL_STUDENT_EMAIL",
    seedPasswordEnv: "SEED_STUDENT_PASSWORD",
  },
};

/**
 * Canonical demo login directory (master-editable).
 * Passwords live as bcrypt on users; optional `publicPasswordHint` is for published demo sheets only.
 */
export type DemoLoginStored = {
  email: string;
  name: string;
  /** Override display label in MAC + public panels. */
  label?: string;
  /** Override org slug (must exist when set). Empty string clears to meta default. */
  orgSlug?: string | null;
  /** Override login path (e.g. `/admin/login?school=1`). */
  loginPath?: string;
  /** Show on public lobbies / login hints. */
  publishPublic?: boolean;
  /** Explicitly published demo password for public display (never derived from hash). */
  publicPasswordHint?: string;
  /** Free-form notes for MAC + download sheet. */
  notes?: string;
};

export type DemoLoginDirectory = Partial<Record<DemoLoginSlotKey, DemoLoginStored>>;

/** Safe public slot shape for lobbies / login hints (no password hashes). */
export type DemoLoginPublicView = {
  key: DemoLoginSlotKey;
  label: string;
  kind: "admin" | "student";
  audience: DemoLoginAudience;
  orgSlug: string | null;
  orgName: string | null;
  loginPath: string;
  email: string;
  name: string;
  /** Only present when master explicitly published a demo password hint. */
  passwordHint: string | null;
  notes: string | null;
};

export function defaultDemoLoginDirectory(): Record<DemoLoginSlotKey, DemoLoginStored> {
  const out = {} as Record<DemoLoginSlotKey, DemoLoginStored>;
  for (const key of DEMO_LOGIN_SLOT_KEYS) {
    const meta = DEMO_LOGIN_SLOT_META[key];
    out[key] = {
      email: meta.defaultEmail,
      name: meta.defaultName,
      publishPublic: meta.defaultPublishPublic,
    };
  }
  return out;
}

export function resolveDemoLoginMeta(key: DemoLoginSlotKey, stored: DemoLoginStored) {
  const meta = DEMO_LOGIN_SLOT_META[key];
  const label = stored.label?.trim() || meta.label;
  const orgSlug =
    stored.orgSlug === undefined
      ? meta.orgSlug
      : stored.orgSlug === null || stored.orgSlug === ""
        ? meta.orgSlug
        : stored.orgSlug.trim();
  const loginPath = stored.loginPath?.trim() || meta.loginPath;
  const publishPublic =
    typeof stored.publishPublic === "boolean" ? stored.publishPublic : meta.defaultPublishPublic;
  return { meta, label, orgSlug, loginPath, publishPublic };
}

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
