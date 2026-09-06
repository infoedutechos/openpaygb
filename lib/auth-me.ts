/** Shared shape for `GET /api/auth/me` (client + server typing). */

export type AuthMeOrganization = {
  id: string;
  name: string;
  slug: string;
  institutionTier: "university" | "school";
  registrationContactEmail: string | null;
  registrationEmailVerifiedAt: string | null;
  emailVerifyStatus: "none" | "pending" | "verified";
};

export type AuthMeAdmin = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organizationId: string | null;
  organization: AuthMeOrganization | null;
  hasProfileImage?: boolean;
  profileImageUrl?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  previousLoginAt?: string | null;
};

export type AuthMeJson = {
  admin: AuthMeAdmin | null;
  /** Valid Pay (ODELPay HUB tuition) JWT and matching `AdminUser` row. */
  tuitionSession: boolean;
  /** URA `admin_session` cookie or local dev `ACCESS_ADMIN` bypass — same gate as admin layout without Pay. */
  adminShellAccess: boolean;
  paymentOps?: { manualConfirmAllowed: boolean };
  /** Profile/org loaded from JWT only — Atlas unreachable. */
  dbDegraded?: boolean;
  /**
   * When true, this admin is a MAC demo-directory account and self-service
   * password changes are locked by Master policy.
   */
  demoPasswordLocked?: boolean;
};
