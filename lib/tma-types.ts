export type TmaRole = "student" | "org_admin" | "master" | "guest";

export type TmaMePayload = {
  role: TmaRole;
  telegram: {
    id: string;
    firstName: string;
    username: string | null;
  };
  welcome: { headline: string; subline: string };
  student: {
    id: string;
    name: string;
    email: string;
    programmeCode: string;
    year: number;
    semester: number;
    organizationName: string;
    organizationSlug: string;
    accountLabel: string;
    lastLoginAt: string | null;
    previousLoginAt: string | null;
  } | null;
  balance: {
    outstandingUgx: number;
    paidUgx: number;
    progressPct: number;
    nextInstallment: { dueLabel: string; amountUgx: number } | null;
  } | null;
  card: {
    maskedPan: string;
    balanceUgx: number;
    status: string;
    holderName: string;
    expiryLabel: string;
  } | null;
  admin: {
    name: string | null;
    email: string;
    role: string;
    organizationName: string | null;
  } | null;
  master: {
    activeSchools: number;
    totalStudents: number;
    totalPayments: number;
    activeCards: number;
    cardBalanceUgx: number;
  } | null;
  adminSummary: {
    students: number;
    collectedUgx: number;
    outstandingUgx: number;
  } | null;
};
