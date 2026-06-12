export type MasterOrgRow = {
  id: string;
  name: string;
  slug: string;
  institutionTier?: string | null;
  unitKind?: string | null;
  operatesUnitKinds?: string[];
  parentOrganizationId?: string | null;
  externalParentName?: string | null;
  parentOrganization?: { name: string; slug: string } | null;
  tenantStatus: string;
  registrationContactEmail: string;
  registrationEmailVerifiedAt: string | null;
  destinationWallet: string;
  checkoutPlatformFeeUgx: number;
  fxOverrideKind: string;
  fxOverrideUgxPerTon: number | null;
  fxOverrideBufferPct: number;
  hasFavicon?: boolean;
  faviconUploadedAt?: string | null;
  _count: { programmes: number; students: number; payments: number };
};

export type MasterOrgRowDrafts = {
  wallet: string;
  fee: string;
  fxKind: string;
  fxUgx: string;
  fxBuffer: string;
};

export type MasterOrgRowBusy = {
  busyId: string | null;
  faviconBusyId: string | null;
  feeBusyId: string | null;
  walletBusyId: string | null;
  fxBusyId: string | null;
};

export type MasterOrgRowHandlers = {
  onWalletChange: (v: string) => void;
  onFeeChange: (v: string) => void;
  onFxKindChange: (v: string) => void;
  onFxUgxChange: (v: string) => void;
  onFxBufferChange: (v: string) => void;
  onSaveWallet: () => void;
  onSaveFee: () => void;
  onSaveFx: () => void;
  onFaviconFile: (file: File) => void;
  onRemoveFavicon: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReopen: () => void;
  onResendVerification?: () => void;
};
