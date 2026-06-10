"use client";

import Image from "next/image";
import type { MasterOrgRow } from "@/components/admin/master-org/types";

type Props = {
  org: MasterOrgRow;
  faviconBusyId: string | null;
  compact?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
  onFile: (file: File) => void;
  onRemove: () => void;
  onUploadClick?: () => void;
};

export function MasterOrgFaviconField({
  org,
  faviconBusyId,
  compact,
  inputRef,
  onFile,
  onRemove,
  onUploadClick,
}: Props) {
  const busy = faviconBusyId === org.id;
  const disabled = Boolean(faviconBusyId);

  return (
    <div className={compact ? "mt-4 flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-x-2 gap-y-1"}>
      {org.hasFavicon ? (
        <Image
          src={`/api/org/${encodeURIComponent(org.slug)}/favicon?v=${encodeURIComponent(org.faviconUploadedAt ?? "")}`}
          alt=""
          width={32}
          height={32}
          unoptimized
          className={
            compact
              ? "h-8 w-8 rounded border border-white/10 bg-black/30 object-cover"
              : "h-8 w-8 shrink-0 rounded border border-white/10 bg-black/30 object-cover"
          }
        />
      ) : compact ? null : (
        <span className="text-[11px] text-slate-600">—</span>
      )}
      <input
        type="file"
        accept=".ico,.png,image/x-icon,image/png,image/vnd.microsoft.icon"
        className="sr-only"
        id={compact ? `favicon-mobile-${org.id}` : undefined}
        ref={inputRef}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
      {compact ? (
        <label
          htmlFor={`favicon-mobile-${org.id}`}
          className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 ${
            disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {busy ? "…" : "Upload favicon"}
        </label>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onUploadClick}
          className="rounded border border-white/15 px-2 py-0.5 text-[11px] font-medium text-slate-200 hover:border-amber-400/40 hover:text-white disabled:opacity-50"
        >
          {busy ? "…" : "Upload"}
        </button>
      )}
      {org.hasFavicon ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className={
            compact
              ? "min-h-[44px] text-xs text-rose-300 underline"
              : "text-[11px] text-rose-300 underline hover:text-rose-200 disabled:opacity-50"
          }
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}
