"use client";

import Image from "next/image";
import Link from "next/link";
import { workspaceEmailVerifyStatus } from "@/lib/organization-workspace-verify";

export type MasterOrgRow = {
  id: string;
  name: string;
  slug: string;
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

type Props = {
  org: MasterOrgRow;
  statusTone: (s: string) => string;
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
};

export function MasterOrgMobileCard({
  org: o,
  statusTone,
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
}: Props) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-black/20 p-4 text-sm text-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-cyan-200/90">{o.slug}</p>
          <p className="font-medium text-white">{o.name}</p>
        </div>
        <p className={`text-xs font-medium ${statusTone(o.tenantStatus)}`}>{o.tenantStatus}</p>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        p:{o._count.programmes} · s:{o._count.students} · pay:{o._count.payments}
      </p>
      {o.registrationContactEmail ? (
        <p className="mt-2 truncate text-xs text-slate-400" title={o.registrationContactEmail}>
          {o.registrationContactEmail}
          {workspaceEmailVerifyStatus(o) === "verified" ? (
            <span className="ml-2 text-emerald-400">· verified</span>
          ) : workspaceEmailVerifyStatus(o) === "pending" ? (
            <span className="ml-2 text-amber-300">· email pending</span>
          ) : null}
        </p>
      ) : null}

      <label className="mt-4 block">
        <span className="text-[11px] font-medium text-slate-500">TON treasury</span>
        <input
          type="text"
          value={walletDraft}
          onChange={(e) => onWalletChange(e.target.value)}
          placeholder="EQ… / UQ… (empty = env)"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-xs text-white"
        />
        <button
          type="button"
          disabled={walletBusyId === o.id}
          onClick={onSaveWallet}
          className="mt-2 min-h-[44px] rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50"
        >
          {walletBusyId === o.id ? "Saving…" : "Save wallet"}
        </button>
      </label>

      <label className="mt-4 block">
        <span className="text-[11px] font-medium text-slate-500">Processing UGX (-1 = inherit)</span>
        <input
          type="number"
          min={-1}
          step={1}
          value={feeDraft}
          onChange={(e) => onFeeChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-sm text-white"
        />
        <button
          type="button"
          disabled={feeBusyId === o.id}
          onClick={onSaveFee}
          className="mt-2 min-h-[44px] rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-50"
        >
          {feeBusyId === o.id ? "Saving…" : "Save fee"}
        </button>
      </label>

      <div className="mt-4 space-y-2">
        <span className="text-[11px] font-medium text-slate-500">FX override</span>
        <select
          value={fxKind}
          onChange={(e) => onFxKindChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
        >
          <option value="inherit">inherit</option>
          <option value="none">none</option>
          <option value="fixed">fixed</option>
          <option value="buffer_pct">buffer %</option>
        </select>
        {fxKind === "fixed" ? (
          <input
            type="number"
            min={1}
            step={1}
            value={fxUgx}
            onChange={(e) => onFxUgxChange(e.target.value)}
            placeholder="UGX / TON"
            className="w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-sm text-white"
          />
        ) : null}
        {fxKind === "buffer_pct" ? (
          <input
            type="number"
            step={0.1}
            value={fxBuffer}
            onChange={(e) => onFxBufferChange(e.target.value)}
            placeholder="Buffer %"
            className="w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-sm text-white"
          />
        ) : null}
        <button
          type="button"
          disabled={fxBusyId === o.id}
          onClick={onSaveFx}
          className="min-h-[44px] w-full rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50"
        >
          {fxBusyId === o.id ? "Saving…" : "Save FX"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {o.hasFavicon ? (
          <Image
            src={`/api/org/${encodeURIComponent(o.slug)}/favicon?v=${encodeURIComponent(o.faviconUploadedAt ?? "")}`}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="h-8 w-8 rounded border border-white/10 bg-black/30 object-cover"
          />
        ) : null}
        <input
          type="file"
          accept=".ico,.png,image/x-icon,image/png,image/vnd.microsoft.icon"
          className="sr-only"
          id={`favicon-mobile-${o.id}`}
          disabled={Boolean(faviconBusyId)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFaviconFile(file);
          }}
        />
        <label
          htmlFor={`favicon-mobile-${o.id}`}
          className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 ${
            faviconBusyId ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {faviconBusyId === o.id ? "…" : "Upload favicon"}
        </label>
        {o.hasFavicon ? (
          <button
            type="button"
            disabled={Boolean(faviconBusyId)}
            onClick={onRemoveFavicon}
            className="min-h-[44px] text-xs text-rose-300 underline"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="mt-4 border-t border-[var(--border)]/60 pt-4">
        {o.slug === "default" ? (
          <span className="text-xs text-slate-500">template org</span>
        ) : o.tenantStatus === "pending" ? (
          <div className="flex flex-col gap-2">
            {workspaceEmailVerifyStatus(o) === "pending" ? (
              <p className="text-[11px] text-amber-300/90">
                Email not verified yet — you can still approve; the school dashboard will show a reminder.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyId === o.id}
              onClick={onApprove}
              className="min-h-[44px] flex-1 rounded-lg bg-emerald-700/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Approve workspace
            </button>
            <button
              type="button"
              disabled={busyId === o.id}
              onClick={onReject}
              className="min-h-[44px] flex-1 rounded-lg bg-rose-800/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Reject
            </button>
            </div>
          </div>
        ) : o.tenantStatus === "active" ? (
          <Link
            href={`/admin?orgSlug=${encodeURIComponent(o.slug)}`}
            className="inline-flex min-h-[44px] items-center text-xs text-sky-300 underline"
          >
            Open tuition dashboard
          </Link>
        ) : o.tenantStatus === "rejected" ? (
          <button
            type="button"
            disabled={busyId === o.id}
            onClick={onReopen}
            className="min-h-[44px] w-full rounded-lg bg-amber-700/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Reopen for review
          </button>
        ) : null}
      </div>
    </article>
  );
}
