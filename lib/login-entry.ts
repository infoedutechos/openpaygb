/** Canonical public login chooser and deep links for OdelPay audiences. */

import { AUDIENCE_GUIDES, type AudienceGuideId } from "@/lib/audience-guides";

export const LOGIN_CHOOSER_PATH = "/login";

export type LoginAudience = AudienceGuideId;

export type LoginChooserCard = {
  id: LoginAudience;
  title: string;
  subtitle: string;
  href: string;
  accent: "sky" | "cyan" | "violet" | "emerald";
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
    id: "admin_schools",
    title: "Admin Login for Schools",
    subtitle: "School staff — programmes, students, bills & receipts",
    href: "/admin/login?school=1",
    accent: "violet",
    guideHref: AUDIENCE_GUIDES.admin_schools.helpHref,
    guideLabel: AUDIENCE_GUIDES.admin_schools.label,
  },
  {
    id: "admin_higher",
    title: "Admin Login for Higher Institutions",
    subtitle: "Institution staff — programmes, fees & tuition admin",
    href: "/admin/login?segment=higher",
    accent: "emerald",
    guideHref: AUDIENCE_GUIDES.admin_higher.helpHref,
    guideLabel: AUDIENCE_GUIDES.admin_higher.label,
  },
];
