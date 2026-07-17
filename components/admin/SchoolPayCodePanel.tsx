"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type CodeResponse = {
  schoolPayCode: string;
  organizationSlug: string;
  organizationName: string;
};

/**
 * Shows the school's SchoolPay-style School Code with a parent "how to pay" explainer.
 * Rendered on /admin/students for org admins (and master with ?orgSlug=).
 */
export function SchoolPayCodePanel({ organizationSlug }: { organizationSlug?: string }) {
  const [data, setData] = useState<CodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const qp = organizationSlug ? `?organizationSlug=${encodeURIComponent(organizationSlug)}` : "";
      const r = await fetch(`/api/admin/school-pay-code${qp}`, { credentials: "include" });
      const parsed = await readJsonResponse<CodeResponse>(r);
      if (cancelled) return;
      if (parsed.ok) {
        setData(parsed.data);
        setError(null);
      } else {
        setError(parsed.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationSlug]);

  if (error) return null;

  const payUrl = data ? `/pay/${encodeURIComponent(data.organizationSlug)}` : "";

  return (
    <section className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-emerald-100">School Code (SchoolPay-style)</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Share this code with parents and guardians. With the code plus the student&apos;s
            admission / registration number, they can find your school and pay fees online —
            no bank queue. Keep SMS and receipts until payments are confirmed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-emerald-400/40 bg-black/30 px-4 py-2 font-mono text-lg font-bold tracking-[0.2em] text-emerald-200">
            {data ? data.schoolPayCode : "······"}
          </span>
          <button
            type="button"
            disabled={!data}
            onClick={() => {
              if (!data) return;
              void navigator.clipboard.writeText(data.schoolPayCode).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowGuide((v) => !v)}
        className="mt-3 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
      >
        {showGuide ? "Hide parent guide" : "How parents pay with this code"}
      </button>
      {showGuide && data ? (
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-300">
          <li>
            Get the <strong>School Code</strong> ({data.schoolPayCode}) from the bursar, the admission
            letter, or this school&apos;s pay page.
          </li>
          <li>
            Have the student&apos;s <strong>admission / registration number</strong> (or full name
            exactly as it appears in school records).
          </li>
          <li>
            Open{" "}
            <Link href="/pay" className="text-cyan-300 hover:underline">
              odelpay → Pay tuition
            </Link>{" "}
            and enter the School Code under <strong>Pay with School Code</strong> — or go straight to{" "}
            <Link href={payUrl} className="text-cyan-300 hover:underline">
              {payUrl}
            </Link>
            .
          </li>
          <li>Choose the amount and pay with mobile money, card, or TON.</li>
          <li>
            Keep the SMS and receipt until the school confirms — receipts stay available under{" "}
            <strong>Receipts</strong>.
          </li>
        </ol>
      ) : null}
    </section>
  );
}
