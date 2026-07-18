/** Canonical public login chooser and deep links for OdelPay audiences. */

import { AUDIENCE_GUIDES, type AudienceGuideId } from "@/lib/audience-guides";

export const LOGIN_CHOOSER_PATH = "/login";

export type LoginAudience = AudienceGuideId;

export type LoginChooserCard = {
  id: LoginAudience;
  title: string;
  subtitle: string;
  href: string;
  accent: "sky" | "cyan" | "violet" | "emerald" | "amber" | "rose";
  /** In-app help article for this audience handbook */
  guideHref: string;
  guideLabel: string;
};

export const LOGIN_CHOOSER_CARDS: LoginChooserCard[] = [
  {
    id: "student_schools",
    title: "Student Login for Schools",
    subtitle: "Primary & secondary — portal with email or admission number",
    href: "/student/login?segment=schools",
    accent: "sky",
    guideHref: AUDIENCE_GUIDES.student_schools.helpHref,
    guideLabel: AUDIENCE_GUIDES.student_schools.label,
  },
  {
    id: "student_higher",
    title: "Student Login for Higher Institutions",
    subtitle: "Universities & tertiary — portal with email or admission number",
    href: "/student/login?segment=higher",
    accent: "cyan",
    guideHref: AUDIENCE_GUIDES.student_higher.helpHref,
    guideLabel: AUDIENCE_GUIDES.student_higher.label,
  },
  {
    id: "staff_schools",
    title: "Staff Login for Schools",
    subtitle: "Teachers & employees — Staff ID + portal password",
    href: "/staff/login?segment=schools",
    accent: "amber",
    guideHref: AUDIENCE_GUIDES.staff_schools.helpHref,
    guideLabel: AUDIENCE_GUIDES.staff_schools.label,
  },
  {
    id: "staff_higher",
    title: "Staff Login for Higher Institutions",
    subtitle: "Institution employees — Staff ID + portal password",
    href: "/staff/login?segment=higher",
    accent: "rose",
    guideHref: AUDIENCE_GUIDES.staff_higher.helpHref,
    guideLabel: AUDIENCE_GUIDES.staff_higher.label,
  },
  {
    id: "admin_schools",
    title: "Admin Login for Schools",
    subtitle: "Bursar / school admin — programmes, students, bills & receipts",
    href: "/admin/login?school=1",
    accent: "violet",
    guideHref: AUDIENCE_GUIDES.admin_schools.helpHref,
    guideLabel: AUDIENCE_GUIDES.admin_schools.label,
  },
  {
    id: "admin_higher",
    title: "Admin Login for Higher Institutions",
    subtitle: "Institution admin — programmes, fees & tuition hub",
    href: "/admin/login?segment=higher",
    accent: "emerald",
    guideHref: AUDIENCE_GUIDES.admin_higher.helpHref,
    guideLabel: AUDIENCE_GUIDES.admin_higher.label,
  },
];
