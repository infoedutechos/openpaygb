"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ModalHeader } from "@/components/nav/ModalHeader";
import {
  SHARE_CHANNELS,
  buildSharePayload,
  copyShareLink,
  openShareUrl,
  shareChannelUrl,
  triggerNativeShare,
} from "@/lib/social-share";

export type StudentShareCardData = {
  id: string;
  name: string;
  admissionNo: string;
  programmeCode: string;
  year: number;
  semester: number;
  organizationName: string;
  organizationSlug: string;
  schoolPayCode?: string;
  cardUrl: string;
  periodLabel?: string;
};

type Props = {
  student: StudentShareCardData;
  /** Compact for embedding on detail page */
  variant?: "modal" | "panel";
  onClose?: () => void;
};

export function StudentShareCard({ student, variant = "panel", onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const periodLabel = student.periodLabel ?? "Term";

  const shareText = useMemo(() => {
    const lines = [
      `${student.name} — ${student.organizationName}`,
      `Admission / registration no.: ${student.admissionNo}`,
      student.schoolPayCode ? `School Code: ${student.schoolPayCode}` : null,
      `Programme: ${student.programmeCode} · Year ${student.year} · ${periodLabel} ${student.semester}`,
      `Student card: ${student.cardUrl}`,
    ].filter(Boolean);
    return lines.join("\n");
  }, [student, periodLabel]);

  const payload = useMemo(
    () =>
      buildSharePayload(student.cardUrl, {
        title: `${student.name} — ${student.organizationName}`,
        text: shareText,
      }),
    [student.cardUrl, student.name, student.organizationName, shareText],
  );

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(student.cardUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [student.cardUrl]);

  function printCard() {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`<!doctype html><html><head><title>${student.name} — Student card</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
        h1{font-size:20px;margin:0 0 4px}
        .muted{color:#64748b;font-size:13px}
        .box{border:1px solid #cbd5e1;border-radius:12px;padding:16px;margin-top:16px}
        .row{display:flex;justify-content:space-between;gap:12px;margin:6px 0;font-size:14px}
        .label{color:#64748b}
        .qr{display:block;margin:16px auto;width:180px;height:180px}
        .mono{font-family:ui-monospace,monospace;font-weight:700;letter-spacing:.06em}
      </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  const shareButtons = SHARE_CHANNELS.filter((c) =>
    ["whatsapp", "telegram", "facebook", "twitter", "email", "copy", "native"].includes(c.id),
  );

  const shell =
    variant === "modal"
      ? "fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      : "";

  const card = (
    <div
      className={
        variant === "modal"
          ? "max-h-[min(92dvh,820px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[#0d1526] p-5 shadow-xl sm:rounded-xl"
          : "rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        {variant === "modal" && onClose ? (
          <ModalHeader
            onBack={onClose}
            title="Student details"
            subtitle="Print this card or share the link via WhatsApp, Telegram, and other apps."
          />
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-white">Student details</h2>
            <p className="mt-1 text-xs text-slate-400">
              Print this card or share the link via WhatsApp, Telegram, and other apps.
            </p>
          </div>
        )}
      </div>

      <div ref={printRef} className="mt-4 rounded-xl border border-white/10 bg-white p-4 text-slate-900">
        <h1 className="text-lg font-semibold">{student.name}</h1>
        <p className="muted text-sm text-slate-500">{student.organizationName}</p>
        <div className="box mt-3 space-y-1 border border-slate-200 rounded-xl p-3">
          <div className="row flex justify-between gap-3 text-sm">
            <span className="label text-slate-500">Admission / registration no.</span>
            <span className="mono font-mono font-bold tracking-wide">{student.admissionNo}</span>
          </div>
          {student.schoolPayCode ? (
            <div className="row flex justify-between gap-3 text-sm">
              <span className="label text-slate-500">School Code</span>
              <span className="mono font-mono font-bold tracking-wide">{student.schoolPayCode}</span>
            </div>
          ) : null}
          <div className="row flex justify-between gap-3 text-sm">
            <span className="label text-slate-500">Programme</span>
            <span>{student.programmeCode}</span>
          </div>
          <div className="row flex justify-between gap-3 text-sm">
            <span className="label text-slate-500">Year / {periodLabel}</span>
            <span>
              {student.year} / {student.semester}
            </span>
          </div>
        </div>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Student card QR code" className="qr mx-auto mt-4 h-44 w-44" />
        ) : (
          <p className="mt-4 text-center text-xs text-slate-500">Generating QR…</p>
        )}
        <p className="muted mt-2 break-all text-center text-[11px] text-slate-500">{student.cardUrl}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={printCard}
          className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
        >
          Print card
        </button>
        <a
          href={student.cardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
        >
          Open share link
        </a>
      </div>

      <p className="mt-4 text-xs font-medium text-slate-400">Share via</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {shareButtons.map((ch) => (
          <button
            key={ch.id}
            type="button"
            className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 hover:text-cyan-100"
            onClick={() => {
              void (async () => {
                if (ch.id === "copy") {
                  const ok = await copyShareLink(student.cardUrl);
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }
                  return;
                }
                if (ch.id === "native") {
                  const ok = await triggerNativeShare(payload);
                  if (!ok) {
                    const wa = shareChannelUrl("whatsapp", payload);
                    if (wa) openShareUrl(wa);
                  }
                  return;
                }
                const url = shareChannelUrl(ch.id, payload);
                if (url) openShareUrl(url);
              })();
            }}
          >
            {ch.id === "copy" && copied ? "Copied" : ch.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (variant === "modal") {
    return (
      <div className={shell} role="dialog" aria-modal="true" aria-label="Student details">
        <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
        <div className="relative z-10 w-full max-w-lg">{card}</div>
      </div>
    );
  }

  return card;
}
