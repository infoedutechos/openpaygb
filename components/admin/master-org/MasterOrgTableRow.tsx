"use client";

import type { MasterOrgRow, MasterOrgRowBusy, MasterOrgRowDrafts, MasterOrgRowHandlers } from "@/components/admin/master-org/types";
import { masterOrgStatusTone } from "@/components/admin/master-org/utils";
import { MasterOrgActions } from "@/components/admin/master-org/MasterOrgActions";
import { MasterOrgEditPasswordPanel } from "@/components/admin/master-org/MasterOrgEditPasswordPanel";
import { MasterOrgEmailVerify } from "@/components/admin/master-org/MasterOrgEmailVerify";
import { MasterOrgFaviconField } from "@/components/admin/master-org/MasterOrgFaviconField";
import { MasterOrgFeeField } from "@/components/admin/master-org/MasterOrgFeeField";
import { MasterOrgFxField } from "@/components/admin/master-org/MasterOrgFxField";
import { MasterOrgUnitSummary } from "@/components/admin/master-org/MasterOrgUnitSummary";
import { MasterOrgWalletField } from "@/components/admin/master-org/MasterOrgWalletField";

type Props = {
  org: MasterOrgRow;
  drafts: MasterOrgRowDrafts;
  busy: MasterOrgRowBusy;
  handlers: MasterOrgRowHandlers;
  manageOpen: boolean;
  onToggleManage: () => void;
  onManageSaved: () => void;
  onManageError: (message: string) => void;
  onManageMessage: (message: string) => void;
  faviconInputRef: (el: HTMLInputElement | null) => void;
  onFaviconUploadClick: () => void;
  colSpan: number;
};

export function MasterOrgTableRow({
  org,
  drafts,
  busy,
  handlers,
  manageOpen,
  onToggleManage,
  onManageSaved,
  onManageError,
  onManageMessage,
  faviconInputRef,
  onFaviconUploadClick,
  colSpan,
}: Props) {
  return (
    <>
      <tr className="border-b border-[var(--border)]/80">
        <td className="py-2 pr-3 font-mono text-cyan-200/90">{org.slug}</td>
        <td className="py-2 pr-3 text-white">{org.name}</td>
        <td className="max-w-[160px] py-2 pr-3 align-top">
          <MasterOrgUnitSummary org={org} />
        </td>
        <td className={`py-2 pr-3 font-medium ${masterOrgStatusTone(org.tenantStatus)}`}>{org.tenantStatus}</td>
        <td className="py-2 pr-3 text-slate-400">
          p:{org._count.programmes} s:{org._count.students} pay:{org._count.payments}
        </td>
        <td className="max-w-[220px] py-2 pr-3 align-top">
          <MasterOrgWalletField
            org={org}
            value={drafts.wallet}
            busy={busy.walletBusyId === org.id}
            onChange={handlers.onWalletChange}
            onSave={handlers.onSaveWallet}
          />
        </td>
        <td className="max-w-[200px] py-2 pr-3 align-top">
          <MasterOrgFeeField
            org={org}
            value={drafts.fee}
            busy={busy.feeBusyId === org.id}
            onChange={handlers.onFeeChange}
            onSave={handlers.onSaveFee}
          />
        </td>
        <td className="max-w-[220px] py-2 pr-3 align-top">
          <MasterOrgFxField
            org={org}
            fxKind={drafts.fxKind}
            fxUgx={drafts.fxUgx}
            fxBuffer={drafts.fxBuffer}
            busy={busy.fxBusyId === org.id}
            onFxKindChange={handlers.onFxKindChange}
            onFxUgxChange={handlers.onFxUgxChange}
            onFxBufferChange={handlers.onFxBufferChange}
            onSave={handlers.onSaveFx}
          />
        </td>
        <td className="max-w-[180px] truncate py-2 pr-3 text-slate-400" title={org.registrationContactEmail}>
          {org.registrationContactEmail || "—"}
        </td>
        <td className="py-2 pr-3 text-xs">
          <MasterOrgEmailVerify
            org={org}
            compact
            busyId={busy.busyId}
            onResendVerification={handlers.onResendVerification}
          />
        </td>
        <td className="py-2 pr-3 align-middle">
          <MasterOrgFaviconField
            org={org}
            faviconBusyId={busy.faviconBusyId}
            inputRef={faviconInputRef}
            onFile={handlers.onFaviconFile}
            onRemove={handlers.onRemoveFavicon}
            onUploadClick={onFaviconUploadClick}
          />
        </td>
        <td className="py-2">
          <MasterOrgActions
            org={org}
            busyId={busy.busyId}
            manageOpen={manageOpen}
            onToggleManage={onToggleManage}
            onApprove={handlers.onApprove}
            onReject={handlers.onReject}
            onReopen={handlers.onReopen}
          />
        </td>
      </tr>
      {manageOpen ? (
        <tr className="border-b border-[var(--border)]/80 bg-amber-950/10">
          <td colSpan={colSpan} className="px-2 py-3">
            <MasterOrgEditPasswordPanel
              key={`${org.id}-${org.name}-${org.registrationContactEmail}`}
              org={org}
              registrationNote={org.registrationNote ?? ""}
              busy={busy.busyId === org.id}
              onSaved={onManageSaved}
              onError={onManageError}
              onMessage={onManageMessage}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}
