export type WorkspaceVerificationStep = {
  id: string;
  label: string;
  done: boolean;
  pending?: boolean;
  skipped?: boolean;
};

type OrgSnapshot = {
  tenantStatus: string;
  registrationEmailVerifiedAt: Date | string | null;
};

export function buildWorkspaceVerificationSteps(
  org: OrgSnapshot,
  autoRegistrationEnabled: boolean,
): WorkspaceVerificationStep[] {
  const emailVerified = Boolean(org.registrationEmailVerifiedAt);
  const active = org.tenantStatus === "active";
  const rejected = org.tenantStatus === "rejected";
  const pending = org.tenantStatus === "pending";

  const masterReview: WorkspaceVerificationStep = autoRegistrationEnabled
    ? {
        id: "master",
        label: "Platform master review",
        done: active,
        skipped: true,
      }
    : {
        id: "master",
        label: "Platform master review",
        done: active,
        pending: emailVerified && pending && !rejected,
      };

  return [
    { id: "submitted", label: "Application submitted", done: true },
    {
      id: "email",
      label: "Registration email verified",
      done: emailVerified,
      pending: !emailVerified && !rejected,
    },
    masterReview,
    {
      id: "active",
      label: "Workspace active",
      done: active,
      pending: !active && !rejected && (autoRegistrationEnabled ? emailVerified : false),
    },
    ...(rejected
      ? [{ id: "rejected", label: "Request not approved", done: false, pending: false }]
      : []),
  ];
}
