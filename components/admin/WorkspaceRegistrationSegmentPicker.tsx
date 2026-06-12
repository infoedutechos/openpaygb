import Link from "next/link";
import type { RegistrationSegment } from "@/lib/institution-tier";
import {
  registrationSegmentCta,
  registrationSegmentSubtitle,
  registrationSegmentTitle,
} from "@/lib/institution-tier";

const CARD: Record<
  RegistrationSegment,
  { border: string; bg: string; title: string; btn: string }
> = {
  higher: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/25",
    title: "text-cyan-300/95",
    btn: "bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 hover:brightness-110",
  },
  schools: {
    border: "border-sky-500/30",
    bg: "bg-sky-950/20",
    title: "text-sky-300/95",
    btn: "bg-gradient-to-r from-sky-400 to-cyan-500 text-slate-950 hover:brightness-110",
  },
};

function SegmentCard({ segment }: { segment: RegistrationSegment }) {
  const a = CARD[segment];
  return (
    <article className={`rounded-2xl border ${a.border} ${a.bg} p-6 shadow-lg shadow-black/20`}>
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${a.title}`}>
        {registrationSegmentTitle(segment)}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-300">{registrationSegmentSubtitle(segment)}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        {segment === "higher"
          ? "Programme fees by semester, ledger receipts, TON and MoMo checkout, and institution admin tooling."
          : "Term-based fee schedules (Term 1–3 at checkout), school workspace registration, and school admin login."}
      </p>
      <Link
        href={`/admin/register?segment=${segment}`}
        className={`mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold transition-[filter] ${a.btn}`}
      >
        {registrationSegmentCta(segment)}
      </Link>
    </article>
  );
}

export function WorkspaceRegistrationSegmentPicker() {
  return (
    <section aria-labelledby="register-segment-heading" className="space-y-4">
      <div className="text-center">
        <h1 id="register-segment-heading" className="text-2xl font-semibold text-white">
          Request school workspace
        </h1>
        <p className="mt-2 text-sm text-slate-500">Choose your OdelPay product line, then complete the form.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SegmentCard segment="higher" />
        <SegmentCard segment="schools" />
      </div>
      <p className="text-center text-sm text-slate-500">
        Already have access?{" "}
        <Link href="/school/login" className="text-sky-400 hover:underline">
          School admin sign in
        </Link>
      </p>
    </section>
  );
}
