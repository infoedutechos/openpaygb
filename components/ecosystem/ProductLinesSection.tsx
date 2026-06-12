import Link from "next/link";
import { PRODUCT_LINE_ORDER, PRODUCT_LINES, type ProductLine } from "@/lib/ecosystem/product-lines";

const ACCENT: Record<ProductLine["accent"], { border: string; bg: string; title: string; btn: string; btnGhost: string }> = {
  cyan: {
    border: "border-cyan-500/25",
    bg: "bg-cyan-950/20",
    title: "text-cyan-300/90",
    btn: "bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 hover:brightness-110",
    btnGhost: "border-cyan-400/45 bg-cyan-500/10 text-cyan-50 hover:border-cyan-300/55 hover:bg-cyan-500/20",
  },
  sky: {
    border: "border-sky-500/25",
    bg: "bg-sky-950/20",
    title: "text-sky-300/90",
    btn: "bg-gradient-to-r from-sky-400 to-cyan-500 text-slate-950 hover:brightness-110",
    btnGhost: "border-sky-400/45 bg-sky-500/10 text-sky-50 hover:border-sky-300/55 hover:bg-sky-500/20",
  },
  violet: {
    border: "border-violet-500/30",
    bg: "bg-violet-950/25",
    title: "text-violet-300/95",
    btn: "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:brightness-110",
    btnGhost: "border-violet-400/45 bg-violet-500/10 text-violet-50 hover:border-violet-300/55 hover:bg-violet-500/20",
  },
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    title: "text-emerald-300/95",
    btn: "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:brightness-110",
    btnGhost: "border-emerald-400/45 bg-emerald-500/10 text-emerald-50 hover:border-emerald-300/55 hover:bg-emerald-500/20",
  },
};

function ProductLineCard({ line }: { line: ProductLine }) {
  const a = ACCENT[line.accent];
  return (
    <article className={`rounded-2xl border ${a.border} ${a.bg} p-6 shadow-lg shadow-black/20`}>
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${a.title}`}>{line.title}</p>
      <p className="mt-1 text-sm font-medium text-slate-300">{line.subtitle}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{line.description}</p>
      <p className="mt-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-400">Audience:</span> {line.audience}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={line.primaryHref}
          className={`inline-flex justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-[filter,colors] ${a.btn}`}
        >
          {line.primaryLabel}
        </Link>
        {line.secondaryHref && line.secondaryLabel ? (
          <Link
            href={line.secondaryHref}
            className={`inline-flex justify-center rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${a.btnGhost}`}
          >
            {line.secondaryLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function ProductLinesSection() {
  const ordered = PRODUCT_LINE_ORDER.map((id) => PRODUCT_LINES.find((p) => p.id === id)!);
  return (
    <section aria-labelledby="product-lines-heading">
      <div className="mb-4">
        <h2 id="product-lines-heading" className="text-lg font-semibold text-white">
          Product lines
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          OdelPay for higher education and schools; OpenPayGB for global wallet, card, and Dex — each with its own entry
          point.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ordered.map((line) => (
          <ProductLineCard key={line.id} line={line} />
        ))}
      </div>
    </section>
  );
}
