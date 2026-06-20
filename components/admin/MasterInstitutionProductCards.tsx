import Link from "next/link";
import {
  registrationSegmentSubtitle,
  registrationSegmentTitle,
  type RegistrationSegment,
} from "@/lib/institution-tier";

type TierStats = {
  active: number;
  pending: number;
  total: number;
};

type Props = {
  higher: TierStats;
  schools: TierStats;
};

const CARD: Record<
  RegistrationSegment,
  { border: string; bg: string; title: string; href: string }
> = {
  higher: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/20 hover:border-cyan-400/40",
    title: "text-cyan-300/95",
    href: "/admin/master/organizations?tier=university",
  },
  schools: {
    border: "border-sky-500/30",
    bg: "bg-sky-950/20 hover:border-sky-400/40",
    title: "text-sky-300/95",
    href: "/admin/master/organizations?tier=school",
  },
};

function TierCard({ segment, stats }: { segment: RegistrationSegment; stats: TierStats }) {
  const a = CARD[segment];
  return (
    <Link
      href={a.href}
      className={`block rounded-2xl border ${a.border} ${a.bg} p-5 transition-colors`}
    >
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${a.title}`}>
        {registrationSegmentTitle(segment)}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-300">{registrationSegmentSubtitle(segment)}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <p>
          <span className="text-slate-500">Active</span>
          <br />
          <span className="text-xl font-semibold tabular-nums text-white">{stats.active}</span>
        </p>
        <p>
          <span className="text-slate-500">Pending</span>
          <br />
          <span className="text-xl font-semibold tabular-nums text-amber-200/90">{stats.pending}</span>
        </p>
        <p>
          <span className="text-slate-500">Total</span>
          <br />
          <span className="text-xl font-semibold tabular-nums text-slate-200">{stats.total}</span>
        </p>
      </div>
      <p className="mt-4 text-xs text-cyan-300/80">Manage tenants →</p>
    </Link>
  );
}

export function MasterInstitutionProductCards({ higher, schools }: Props) {
  return (
    <section aria-labelledby="master-product-lines-heading" className="space-y-4">
      <div>
        <h2 id="master-product-lines-heading" className="text-sm font-semibold text-white">
          OdelPay product lines
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Higher institutions and primary/secondary schools — each with separate tenant workspaces.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TierCard segment="higher" stats={higher} />
        <TierCard segment="schools" stats={schools} />
      </div>
    </section>
  );
}
