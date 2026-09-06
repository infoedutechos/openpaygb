import Link from "next/link";
import { productLineById } from "@/lib/ecosystem/product-lines";
import { assessmentVerseUrls } from "@/lib/assessmentverse";
import { PLATFORM_BRAND_NAME } from "@/lib/platform-brand";

export const dynamic = "force-dynamic";

export default function AssessmentVerseOSPage() {
  const line = productLineById("assessmentverse_os")!;
  const urls = assessmentVerseUrls();
  const remoteReady = !urls.isLocalDefault;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-24 pt-10">
      <header className="rounded-3xl border border-teal-500/30 bg-teal-950/20 p-8 shadow-lg shadow-black/25">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300/95">{line.title}</p>
        <p className="mt-1 text-sm font-medium text-slate-300">{line.subtitle}</p>
        <h1 className="mt-4 text-2xl font-semibold text-white md:text-3xl">{line.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{line.description}</p>
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-400">Audience:</span> {line.audience}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          AssessmentVerse OS is <strong className="font-semibold text-slate-200">not OdelPay</strong>. OdelPay is tuition
          and settlement. AssessmentVerse OS is marks, report cards, and class lists.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {remoteReady ? (
            <>
              <a
                href={urls.ui}
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
              >
                Open AssessmentVerse
              </a>
              <a
                href={urls.login}
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-xl border border-teal-400/45 bg-teal-500/10 px-5 py-2.5 text-sm font-semibold text-teal-50 hover:border-teal-300/55 hover:bg-teal-500/20"
              >
                Sign in
              </a>
            </>
          ) : (
            <Link
              href="/help"
              className="inline-flex justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
            >
              Help center
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-slate-100 hover:border-teal-400/35"
          >
            ← {PLATFORM_BRAND_NAME} lobby
          </Link>
        </div>
      </header>

      {remoteReady ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Stages</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li>
              <a
                href={urls.schools}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 transition hover:border-teal-400/40"
              >
                <p className="text-sm font-semibold text-white">Schools</p>
                <p className="mt-1 text-xs text-slate-400">Nursery · Primary · Secondary</p>
              </a>
            </li>
            <li>
              <a
                href={urls.higher}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 transition hover:border-teal-400/40"
              >
                <p className="text-sm font-semibold text-white">Higher</p>
                <p className="mt-1 text-xs text-slate-400">Tertiary assessment line</p>
              </a>
            </li>
          </ul>
        </section>
      ) : (
        <section className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-slate-400">
          <h2 className="text-base font-semibold text-white">Hosted AssessmentVerse</h2>
          <p className="mt-2 leading-relaxed">
            The public AssessmentVerse app is not linked from this deployment yet. Operators can set{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-teal-100">
              NEXT_PUBLIC_ASSESSMENTVERSE_URL
            </code>{" "}
            to the live AssessmentVerse host. Local development uses ports 5000 (UI) and 5001 (API) on this machine
            only — those addresses are intentionally not advertised in the public header or footer.
          </p>
        </section>
      )}
    </div>
  );
}
