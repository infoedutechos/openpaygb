import Link from "next/link";
import type { DemoLoginPublicView } from "@/lib/demo-logins-shared";

const ACCENT = {
  school: {
    border: "border-sky-500/30",
    bg: "bg-sky-950/20",
    title: "text-sky-200",
  },
  university: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/20",
    title: "text-cyan-200",
  },
  platform: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/15",
    title: "text-emerald-200",
  },
} as const;

export function DemoLoginDetailsPanel({
  title,
  subtitle,
  slots,
  accent = "school",
}: {
  title?: string;
  subtitle?: string;
  slots: DemoLoginPublicView[];
  accent?: keyof typeof ACCENT;
}) {
  if (!slots.length) return null;
  const a = ACCENT[accent];

  return (
    <section className={`rounded-2xl border ${a.border} ${a.bg} p-5 shadow-lg shadow-black/20`}>
      <h2 className={`text-sm font-semibold ${a.title}`}>
        {title ?? "Demo login details"}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        {subtitle ??
          "Auto-updated from Master Admin Console. Change emails, names, or published passwords there and this panel refreshes."}
      </p>
      <ul className="mt-4 space-y-3">
        {slots.map((s) => (
          <li
            key={s.key}
            className="rounded-xl border border-white/10 bg-black/25 px-4 py-3"
          >
            <p className="text-sm font-medium text-white">{s.label}</p>
            <dl className="mt-2 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
              <div>
                <dt className="inline text-slate-500">Name · </dt>
                <dd className="inline text-slate-200">{s.name}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">Email · </dt>
                <dd className="inline font-mono text-cyan-200/90">{s.email}</dd>
              </div>
              {s.orgSlug ? (
                <div>
                  <dt className="inline text-slate-500">Org · </dt>
                  <dd className="inline font-mono text-slate-300">
                    {s.orgName ? `${s.orgName} · ` : ""}
                    {s.orgSlug}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="inline text-slate-500">Login · </dt>
                <dd className="inline">
                  <Link href={s.loginPath} className="text-cyan-300 hover:underline">
                    {s.loginPath}
                  </Link>
                </dd>
              </div>
              {s.passwordHint ? (
                <div className="sm:col-span-2">
                  <dt className="inline text-slate-500">Password · </dt>
                  <dd className="inline font-mono text-amber-100/90">{s.passwordHint}</dd>
                </div>
              ) : (
                <div className="sm:col-span-2 text-slate-500">
                  Password set in MAC (not published as a public hint).
                </div>
              )}
              {s.notes ? (
                <div className="sm:col-span-2 text-slate-400">{s.notes}</div>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
