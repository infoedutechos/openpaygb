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
  deferEmailVerification = false,
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
        pending: pending && !rejected && (deferEmailVerification || emailVerified),
      };

  const emailStep: WorkspaceVerificationStep = deferEmailVerification
    ? {
        id: "email",
        label: "Confirm registration email (when ready)",
        done: emailVerified,
        pending: !emailVerified && !rejected,
      }
    : {
        id: "email",
        label: "Registration email verified",
        done: emailVerified,
        pending: !emailVerified && !rejected,
      };

  const activePending =
    !active &&
    !rejected &&
    (autoRegistrationEnabled
      ? deferEmailVerification
        ? pending
        : emailVerified
      : deferEmailVerification || emailVerified);

  return [
    { id: "submitted", label: "Application submitted", done: true },
    emailStep,
    masterReview,
    {
      id: "active",
      label: "Workspace active",
      done: active,
      pending: activePending,
    },
    ...(rejected
      ? [{ id: "rejected", label: "Request not approved", done: false, pending: false }]
      : []),
  ];
}
