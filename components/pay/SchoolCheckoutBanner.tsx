import Link from "next/link";

type Props = {
  organizationName: string;
  organizationSlug: string;
  className?: string;
};

/** Shows which school (tenant) this checkout belongs to — school is chosen via `/pay` or `/pay/{slug}`. */
export function SchoolCheckoutBanner({ organizationName, organizationSlug, className = "" }: Props) {
  const slug = organizationSlug.trim().toLowerCase();
  const name = organizationName.trim() || slug;

  return (
    <section
      className={`rounded-xl border border-cyan-500/35 bg-cyan-950/40 px-4 py-3 text-left ${className}`}
      aria-label="Current school"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-cyan-300/90">Paying at this school</p>
          <p className="mt-0.5 text-sm font-semibold text-white">{name}</p>
          <p className="font-mono text-xs text-slate-400">Tenant: {slug}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            Your student record and payments are stored under this school. Wrong school? Switch before you pay.
          </p>
        </div>
        <Link
          href="/pay"
          className="shrink-0 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-cyan-100 hover:border-cyan-400/40 hover:bg-cyan-500/10"
        >
          Change school
        </Link>
      </div>
    </section>
  );
}
