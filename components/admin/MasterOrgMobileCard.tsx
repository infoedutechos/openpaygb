"use client";

import { MasterOrgActions } from "@/components/admin/master-org/MasterOrgActions";
import { MasterOrgEditPasswordPanel } from "@/components/admin/master-org/MasterOrgEditPasswordPanel";
import { MasterOrgEmailVerify } from "@/components/admin/master-org/MasterOrgEmailVerify";
import { MasterOrgFaviconField } from "@/components/admin/master-org/MasterOrgFaviconField";
import { MasterOrgFeeField } from "@/components/admin/master-org/MasterOrgFeeField";
import { MasterOrgFxField } from "@/components/admin/master-org/MasterOrgFxField";
import { MasterOrgUnitSummary } from "@/components/admin/master-org/MasterOrgUnitSummary";
import { MasterOrgWalletField } from "@/components/admin/master-org/MasterOrgWalletField";
import type { MasterOrgRow } from "@/components/admin/master-org/types";
import { masterOrgStatusTone } from "@/components/admin/master-org/utils";

export type { MasterOrgRow } from "@/components/admin/master-org/types";

type Props = {
  org: MasterOrgRow;
  walletDraft: string;
  feeDraft: string;
  fxKind: string;
  fxUgx: string;
  fxBuffer: string;
  busyId: string | null;
  faviconBusyId: string | null;
  feeBusyId: string | null;
  walletBusyId: string | null;
  fxBusyId: string | null;
  manageOpen: boolean;
  onToggleManage: () => void;
  onManageSaved: () => void;
  onManageError: (message: string) => void;
  onManageMessage: (message: string) => void;
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

export function MasterOrgMobileCard({
  org,
  walletDraft,
  feeDraft,
  fxKind,
  fxUgx,
  fxBuffer,
  busyId,
  faviconBusyId,
  feeBusyId,
  walletBusyId,
  fxBusyId,
  manageOpen,
  onToggleManage,
  onManageSaved,
  onManageError,
  onManageMessage,
  onWalletChange,
  onFeeChange,
  onFxKindChange,
  onFxUgxChange,
  onFxBufferChange,
  onSaveWallet,
  onSaveFee,
  onSaveFx,
  onFaviconFile,
  onRemoveFavicon,
  onApprove,
  onReject,
  onReopen,
  onResendVerification,
}: Props) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-black/20 p-4 text-sm text-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-cyan-200/90">{org.slug}</p>
          <p className="font-medium text-white">{org.name}</p>
        </div>
        <p className={`text-xs font-medium ${masterOrgStatusTone(org.tenantStatus)}`}>{org.tenantStatus}</p>
      </div>
      <MasterOrgUnitSummary org={org} compact />
      <p className="mt-2 text-xs text-slate-500">
        p:{org._count.programmes} · s:{org._count.students} · pay:{org._count.payments}
      </p>

      <MasterOrgEmailVerify
        org={org}
        busyId={busyId}
        onResendVerification={onResendVerification}
      />

      <MasterOrgWalletField
        org={org}
        value={walletDraft}
        busy={walletBusyId === org.id}
        compact
        onChange={onWalletChange}
        onSave={onSaveWallet}
      />

      <MasterOrgFeeField
        org={org}
        value={feeDraft}
        busy={feeBusyId === org.id}
        compact
        onChange={onFeeChange}
        onSave={onSaveFee}
      />

      <MasterOrgFxField
        org={org}
        fxKind={fxKind}
        fxUgx={fxUgx}
        fxBuffer={fxBuffer}
        busy={fxBusyId === org.id}
        compact
        onFxKindChange={onFxKindChange}
        onFxUgxChange={onFxUgxChange}
        onFxBufferChange={onFxBufferChange}
        onSave={onSaveFx}
      />

      <MasterOrgFaviconField
        org={org}
        faviconBusyId={faviconBusyId}
        compact
        onFile={onFaviconFile}
        onRemove={onRemoveFavicon}
      />

      <div className="mt-4 border-t border-[var(--border)]/60 pt-4">
        <MasterOrgActions
          org={org}
          busyId={busyId}
          compact
          manageOpen={manageOpen}
          onToggleManage={onToggleManage}
          onApprove={onApprove}
          onReject={onReject}
          onReopen={onReopen}
        />
        {manageOpen ? (
          <MasterOrgEditPasswordPanel
            key={`${org.id}-${org.name}-${org.registrationContactEmail}`}
            org={org}
            registrationNote={org.registrationNote ?? ""}
            busy={busyId === org.id}
            onSaved={onManageSaved}
            onError={onManageError}
            onMessage={onManageMessage}
          />
        ) : null}
      </div>
    </article>
  );
}
