import Link from "next/link";
import { LOGIN_CHOOSER_CARDS, type LoginChooserCard } from "@/lib/login-entry";

const ACCENT: Record<
  LoginChooserCard["accent"],
  { border: string; bg: string; title: string; ring: string }
> = {
  sky: {
    border: "border-sky-500/35",
    bg: "bg-sky-950/25",
    title: "text-sky-200",
    ring: "hover:ring-sky-400/40",
  },
  cyan: {
    border: "border-cyan-500/35",
    bg: "bg-cyan-950/25",
    title: "text-cyan-200",
    ring: "hover:ring-cyan-400/40",
  },
  violet: {
    border: "border-violet-500/35",
    bg: "bg-violet-950/25",
    title: "text-violet-200",
    ring: "hover:ring-violet-400/40",
  },
  emerald: {
    border: "border-emerald-500/35",
    bg: "bg-emerald-950/25",
    title: "text-emerald-200",
    ring: "hover:ring-emerald-400/40",
  },
  amber: {
    border: "border-amber-500/35",
    bg: "bg-amber-950/25",
    title: "text-amber-200",
    ring: "hover:ring-amber-400/40",
  },
  rose: {
    border: "border-rose-500/35",
    bg: "bg-rose-950/25",
    title: "text-rose-200",
    ring: "hover:ring-rose-400/40",
  },
};

export function LoginChooserCards() {
  return (
    <section aria-labelledby="login-chooser-heading" className="space-y-5">
      <div className="text-center">
        <h1 id="login-chooser-heading" className="text-2xl font-semibold text-white sm:text-3xl">
          Log in
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Choose the portal that matches your school or institution.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LOGIN_CHOOSER_CARDS.map((card) => {
          const a = ACCENT[card.accent];
          return (
            <div
              key={card.id}
              className={`rounded-2xl border ${a.border} ${a.bg} p-5 text-left shadow-lg shadow-black/25`}
            >
              <Link
                href={card.href}
                className={`block transition-all hover:brightness-105 hover:ring-2 ${a.ring} rounded-xl -m-1 p-1`}
              >
                <p className={`text-sm font-semibold ${a.title}`}>{card.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{card.subtitle}</p>
                <p className="mt-3 text-xs font-semibold text-slate-300">Continue →</p>
              </Link>
              <Link
                href={card.guideHref}
                className="mt-3 inline-block text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
              >
                {card.guideLabel}
              </Link>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-slate-500">
        Prefer a downloadable handbook? See{" "}
        <Link href="/api/docs/guides/USER_GUIDE_INDEX.md" className="text-cyan-400/90 hover:underline">
          user guides index
        </Link>{" "}
        or Help center at{" "}
        <Link href="/help" className="text-cyan-400/90 hover:underline">
          /help
        </Link>
        .
      </p>
    </section>
  );
}
