/** Canonical public login chooser and deep links for OdelPay audiences. */

export const LOGIN_CHOOSER_PATH = "/login";

export type LoginAudience =
  | "student_schools"
  | "student_higher"
  | "admin_schools"
  | "admin_higher";

export type LoginChooserCard = {
  id: LoginAudience;
  title: string;
  subtitle: string;
  href: string;
  accent: "sky" | "cyan" | "violet" | "emerald";
};

export const LOGIN_CHOOSER_CARDS: LoginChooserCard[] = [
  {
    id: "student_schools",
    title: "Student Login for Schools",
    subtitle: "Primary & secondary — portal with email or admission number",
    href: "/student/login?segment=schools",
    accent: "sky",
  },
  {
    id: "student_higher",
    title: "Student Login for Higher Institutions",
    subtitle: "Universities & tertiary — portal with email or admission number",
    href: "/student/login?segment=higher",
    accent: "cyan",
  },
  {
    id: "admin_schools",
    title: "Admin Login for Schools",
    subtitle: "School staff — programmes, students, bills & receipts",
    href: "/admin/login?school=1",
    accent: "violet",
  },
  {
    id: "admin_higher",
    title: "Admin Login for Higher Institutions",
    subtitle: "Institution staff — programmes, fees & tuition admin",
    href: "/admin/login?segment=higher",
    accent: "emerald",
  },
];
