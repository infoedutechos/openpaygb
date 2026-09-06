import Link from "next/link";
import { productLineById } from "@/lib/ecosystem/product-lines";
import { assessmentVerseUrls } from "@/lib/assessmentverse";

export const dynamic = "force-dynamic";

export default function AssessmentVerseOSPage() {
  const line = productLineById("assessmentverse_os")!;
  const urls = assessmentVerseUrls();
  const runtimes = [
    {
      port: 5000,
      name: "App shell (Vite)",
      url: urls.ui,
      start: 'cd "AI Students Report Genarator\\frontend" then npm run dev',
      body: "Platform catalog, Schools, Higher, logins, and auto-save editors.",
    },
    {
      port: 5001,
      name: "API and print desk (Flask)",
      url: urls.api,
      start: 'cd "AI Students Report Genarator" then python app.py',
      body: "JSON API, SQLite, report-card preview, student lists, and subjects.",
    },
  ];

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
          and settlement. AssessmentVerse OS is marks, report cards, and class lists. First tenant: Kyotera Central
          (workspace <code className="rounded bg-black/35 px-1.5 py-0.5 text-xs text-teal-100">kyotera-central</code>
          ).
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={urls.ui}
            target="_blank"
            rel="noreferrer"
            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            Open platform (5000)
          </a>
          <a
            href={urls.api}
            target="_blank"
            rel="noreferrer"
            className="inline-flex justify-center rounded-xl border border-teal-400/45 bg-teal-500/10 px-5 py-2.5 text-sm font-semibold text-teal-50 hover:border-teal-300/55 hover:bg-teal-500/20"
          >
            Open Flask (5001)
          </a>
          <a
            href={urls.login}
            target="_blank"
            rel="noreferrer"
            className="inline-flex justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-slate-100 hover:border-teal-400/35"
          >
            Sign in
          </a>
        </div>
        <p className="mt-4">
          <Link href="/" className="text-xs text-slate-500 hover:text-teal-300 hover:underline">
            ← ODELPay HUB lobby
          </Link>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Runtimes</h2>
        <p className="text-sm text-slate-500">
          These hosts run on this machine. They will not open from the public internet unless AssessmentVerse OS is
          started locally (or you set <code className="text-slate-400">NEXT_PUBLIC_ASSESSMENTVERSE_URL</code>).
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {runtimes.map((r) => (
            <li key={r.port} className="rounded-xl border border-teal-500/20 bg-teal-950/15 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-300/90">{r.port}</p>
              <p className="mt-1 text-sm font-semibold text-white">{r.name}</p>
              <p className="mt-1 break-all font-mono text-xs text-teal-200/80">{r.url}</p>
              <p className="mt-2 text-sm text-slate-400">{r.body}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                <span className="font-semibold uppercase tracking-wide">Start</span> {r.start}
              </p>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-semibold text-teal-200 hover:underline"
              >
                Open {r.port} →
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Products</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <a
              href={urls.schools}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 transition hover:border-teal-400/40"
            >
              <p className="text-sm font-semibold text-white">Schools</p>
              <p className="mt-1 text-xs text-slate-400">Nursery · Primary Lower/Upper · Secondary Lower/Upper</p>
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
              <p className="mt-1 text-xs text-slate-400">Independent tertiary line — empty until real data</p>
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
