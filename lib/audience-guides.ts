/**
 * Canonical audience handbooks — footer, login chooser, dashboards, and help center.
 * In-app links use `/help/{slug}` (KB seed). Markdown lives under `docs/guides/`.
 */

export type AudienceGuideId =
  | "student_schools"
  | "student_higher"
  | "staff_schools"
  | "staff_higher"
  | "admin_schools"
  | "admin_higher";

export type AudienceGuide = {
  id: AudienceGuideId;
  /** Short footer / nav label */
  label: string;
  /** Longer dashboard label */
  dashboardLabel: string;
  helpHref: string;
  helpSlug: string;
  markdownPath: string;
  markdownHref: string;
  docsIndexHref: string;
};

export const USER_GUIDES_INDEX_HREF = "/api/docs/guides/USER_GUIDE_INDEX.md";
export const HELP_CENTER_HREF = "/help";

export const AUDIENCE_GUIDES: Record<AudienceGuideId, AudienceGuide> = {
  student_schools: {
    id: "student_schools",
    label: "Student guide (schools)",
    dashboardLabel: "User guide — schools",
    helpHref: "/help/guide-student-schools",
    helpSlug: "guide-student-schools",
    markdownPath: "guides/USER_GUIDE_STUDENT_SCHOOLS.md",
    markdownHref: "/api/docs/guides/USER_GUIDE_STUDENT_SCHOOLS.md",
    docsIndexHref: USER_GUIDES_INDEX_HREF,
  },
  student_higher: {
    id: "student_higher",
    label: "Student guide (higher)",
    dashboardLabel: "User guide — higher",
    helpHref: "/help/guide-student-higher",
    helpSlug: "guide-student-higher",
    markdownPath: "guides/USER_GUIDE_STUDENT_HIGHER.md",
    markdownHref: "/api/docs/guides/USER_GUIDE_STUDENT_HIGHER.md",
    docsIndexHref: USER_GUIDES_INDEX_HREF,
  },
  staff_schools: {
    id: "staff_schools",
    label: "Staff guide (schools)",
    dashboardLabel: "Staff guide — schools",
    helpHref: "/help/guide-staff-schools",
    helpSlug: "guide-staff-schools",
    markdownPath: "guides/USER_GUIDE_STAFF_SCHOOLS.md",
    markdownHref: "/api/docs/guides/USER_GUIDE_STAFF_SCHOOLS.md",
    docsIndexHref: USER_GUIDES_INDEX_HREF,
  },
  staff_higher: {
    id: "staff_higher",
    label: "Staff guide (higher)",
    dashboardLabel: "Staff guide — higher",
    helpHref: "/help/guide-staff-higher",
    helpSlug: "guide-staff-higher",
    markdownPath: "guides/USER_GUIDE_STAFF_HIGHER.md",
    markdownHref: "/api/docs/guides/USER_GUIDE_STAFF_HIGHER.md",
    docsIndexHref: USER_GUIDES_INDEX_HREF,
  },
  admin_schools: {
    id: "admin_schools",
    label: "Admin guide (schools)",
    dashboardLabel: "User guide — schools",
    helpHref: "/help/guide-admin-schools",
    helpSlug: "guide-admin-schools",
    markdownPath: "guides/USER_GUIDE_ADMIN_SCHOOLS.md",
    markdownHref: "/api/docs/guides/USER_GUIDE_ADMIN_SCHOOLS.md",
    docsIndexHref: USER_GUIDES_INDEX_HREF,
  },
  admin_higher: {
    id: "admin_higher",
    label: "Admin guide (higher)",
    dashboardLabel: "User guide — higher",
    helpHref: "/help/guide-admin-higher",
    helpSlug: "guide-admin-higher",
    markdownPath: "guides/USER_GUIDE_ADMIN_HIGHER.md",
    markdownHref: "/api/docs/guides/USER_GUIDE_ADMIN_HIGHER.md",
    docsIndexHref: USER_GUIDES_INDEX_HREF,
  },
};

export const AUDIENCE_GUIDE_LIST: AudienceGuide[] = [
  AUDIENCE_GUIDES.student_schools,
  AUDIENCE_GUIDES.student_higher,
  AUDIENCE_GUIDES.staff_schools,
  AUDIENCE_GUIDES.staff_higher,
  AUDIENCE_GUIDES.admin_schools,
  AUDIENCE_GUIDES.admin_higher,
];

/** Footer / Services column links for all handbooks. */
export function audienceGuideFooterLinks(): { label: string; href: string }[] {
  return [
    ...AUDIENCE_GUIDE_LIST.map((g) => ({ label: g.label, href: g.helpHref })),
    { label: "All user guides (index)", href: USER_GUIDES_INDEX_HREF },
    { label: "Help center", href: HELP_CENTER_HREF },
  ];
}

export function adminGuideForTier(institutionTier: string | null | undefined): AudienceGuide {
  return institutionTier === "school" ? AUDIENCE_GUIDES.admin_schools : AUDIENCE_GUIDES.admin_higher;
}

export function staffGuideForTier(institutionTier: string | null | undefined): AudienceGuide {
  return institutionTier === "school" ? AUDIENCE_GUIDES.staff_schools : AUDIENCE_GUIDES.staff_higher;
}

export function studentGuidesForPortal(): AudienceGuide[] {
  return [AUDIENCE_GUIDES.student_schools, AUDIENCE_GUIDES.student_higher];
}

export function staffGuidesForPortal(): AudienceGuide[] {
  return [AUDIENCE_GUIDES.staff_schools, AUDIENCE_GUIDES.staff_higher];
}
