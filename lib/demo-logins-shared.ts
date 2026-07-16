export const DEMO_LOGIN_SLOT_KEYS = [
  "master",
  "university_admin",
  "university_student",
  "school_admin",
  "school_student",
] as const;

export type DemoLoginSlotKey = (typeof DEMO_LOGIN_SLOT_KEYS)[number];

export type DemoLoginSlotMeta = {
  key: DemoLoginSlotKey;
  label: string;
  kind: "admin" | "student";
  role?: "master" | "org_admin";
  orgSlug: string | null;
  loginPath: string;
  defaultEmail: string;
  defaultName: string;
  seedEmailEnv?: string;
  seedPasswordEnv?: string;
};

export const DEMO_LOGIN_SLOT_META: Record<DemoLoginSlotKey, DemoLoginSlotMeta> = {
  master: {
    key: "master",
    label: "Platform master",
    kind: "admin",
    role: "master",
    orgSlug: null,
    loginPath: "/admin/login?master=1",
    defaultEmail: "master@odelhub.local",
    defaultName: "Platform Master",
    seedEmailEnv: "SEED_MASTER_EMAIL",
    seedPasswordEnv: "SEED_MASTER_PASSWORD",
  },
  university_admin: {
    key: "university_admin",
    label: "University org admin",
    kind: "admin",
    role: "org_admin",
    orgSlug: "default",
    loginPath: "/school/login",
    defaultEmail: "admin@odelhub.local",
    defaultName: "School Admin",
    seedEmailEnv: "SEED_ADMIN_EMAIL",
    seedPasswordEnv: "SEED_ADMIN_PASSWORD",
  },
  university_student: {
    key: "university_student",
    label: "University demo student",
    kind: "student",
    orgSlug: "default",
    loginPath: "/student/login",
    defaultEmail: "student@odelhub.local",
    defaultName: "Nabiddo Rehema Mbuga",
    seedEmailEnv: "SEED_STUDENT_EMAIL",
    seedPasswordEnv: "SEED_STUDENT_PASSWORD",
  },
  school_admin: {
    key: "school_admin",
    label: "Riverside school admin",
    kind: "admin",
    role: "org_admin",
    orgSlug: "riverside-demo",
    loginPath: "/school/login",
    defaultEmail: "school.admin@odelhub.local",
    defaultName: "Riverside School Admin",
    seedEmailEnv: "SEED_SCHOOL_ADMIN_EMAIL",
    seedPasswordEnv: "SEED_ADMIN_PASSWORD",
  },
  school_student: {
    key: "school_student",
    label: "Riverside school student",
    kind: "student",
    orgSlug: "riverside-demo",
    loginPath: "/student/login",
    defaultEmail: "school.student@odelhub.local",
    defaultName: "Amina Okello (demo)",
    seedEmailEnv: "SEED_SCHOOL_STUDENT_EMAIL",
    seedPasswordEnv: "SEED_STUDENT_PASSWORD",
  },
};

export type DemoLoginStored = { email: string; name: string };

export type DemoLoginDirectory = Partial<Record<DemoLoginSlotKey, DemoLoginStored>>;

export function defaultDemoLoginDirectory(): Record<DemoLoginSlotKey, DemoLoginStored> {
  const out = {} as Record<DemoLoginSlotKey, DemoLoginStored>;
  for (const key of DEMO_LOGIN_SLOT_KEYS) {
    const meta = DEMO_LOGIN_SLOT_META[key];
    out[key] = { email: meta.defaultEmail, name: meta.defaultName };
  }
  return out;
}
