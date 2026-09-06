import Link from "next/link";
import type { InstitutionTier } from "@prisma/client";
import { DemoLoginDetailsPanel } from "@/components/demo/DemoLoginDetailsPanel";
import { ProductBrandMark } from "@/components/ecosystem/ProductBrandMark";
import { listPublicDemoLogins } from "@/lib/demo-logins";
import { listActiveOrganizationsByTier } from "@/lib/organizations";
import { productLineById, type ProductLineId } from "@/lib/ecosystem/product-lines";
import type { ProductLogoId } from "@/lib/platform-brand";
import { getProductLogoPublicUrls } from "@/lib/product-logos";

const LINE_TO_LOGO: Partial<Record<ProductLineId, ProductLogoId>> = {
  odelpay_higher: "higher",
  odelpay_schools: "schools",
  openpaygb: "openpaygb",
  developers: "hub",
};

const ACCENT: Record<
  ProductLineId,
  { border: string; bg: string; title: string; btn: string; btnGhost: string }
> = {
  odelpay_higher: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/25",
    title: "text-cyan-300/95",
    btn: "bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 hover:brightness-110",
    btnGhost: "border-cyan-400/45 bg-cyan-500/10 text-cyan-50 hover:border-cyan-300/55 hover:bg-cyan-500/20",
  },
  odelpay_schools: {
    border: "border-sky-500/30",
    bg: "bg-sky-950/20",
    title: "text-sky-300/95",
    btn: "bg-gradient-to-r from-sky-400 to-cyan-500 text-slate-950 hover:brightness-110",
    btnGhost: "border-sky-400/45 bg-sky-500/10 text-sky-50 hover:border-sky-300/55 hover:bg-sky-500/20",
  },
  openpaygb: {
    border: "border-violet-500/30",
    bg: "bg-violet-950/25",
    title: "text-violet-300/95",
    btn: "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:brightness-110",
    btnGhost: "border-violet-400/45 bg-violet-500/10 text-violet-50 hover:border-violet-300/55 hover:bg-violet-500/20",
  },
  developers: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    title: "text-emerald-300/95",
    btn: "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:brightness-110",
    btnGhost: "border-emerald-400/45 bg-emerald-500/10 text-emerald-50 hover:border-emerald-300/55 hover:bg-emerald-500/20",
  },
  assessmentverse_os: {
    border: "border-teal-500/30",
    bg: "bg-teal-950/20",
    title: "text-teal-300/95",
    btn: "bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 hover:brightness-110",
    btnGhost: "border-teal-400/45 bg-teal-500/10 text-teal-50 hover:border-teal-300/55 hover:bg-teal-500/20",
  },
};

export async function ProductLineLanding({
  lineId,
  tenantTier,
  tenantHeading,
  tenantEmpty,
}: {
  lineId: ProductLineId;
  tenantTier?: InstitutionTier;
  tenantHeading?: string;
  tenantEmpty?: string;
}) {
  const line = productLineById(lineId)!;
  const a = ACCENT[lineId];
  const [tenants, productLogos] = await Promise.all([
    tenantTier ? listActiveOrganizationsByTier(tenantTier) : Promise.resolve([]),
    getProductLogoPublicUrls(),
  ]);
  const demoAudience =
    tenantTier === "school" ? "school" : tenantTier === "university" ? "university" : null;
  const demoSlots = demoAudience
    ? await listPublicDemoLogins({ audience: demoAudience })
    : [];
  const logoId = LINE_TO_LOGO[lineId];
  const logoUrl = logoId ? productLogos[logoId] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-24 pt-10">
      <header className={`rounded-3xl border ${a.border} ${a.bg} p-8 shadow-lg shadow-black/25`}>
        <div className="flex items-start gap-4">
          {logoId && logoUrl ? (
            <ProductBrandMark
              product={logoId}
              url={logoUrl}
              label={line.title}
              size={56}
              className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 bg-black/30 p-1.5"
            />
          ) : null}
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-[0.22em] ${a.title}`}>{line.title}</p>
            <p className="mt-1 text-sm font-medium text-slate-300">{line.subtitle}</p>
            <h1 className="mt-4 text-2xl font-semibold text-white md:text-3xl">{line.title}</h1>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{line.description}</p>
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-400">Audience:</span> {line.audience}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={line.primaryHref}
            className={`inline-flex justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-[filter] ${a.btn}`}
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
        <p className="mt-4">
          <Link href="/" className="text-xs text-slate-500 hover:text-cyan-300 hover:underline">
            ← ODELPay HUB lobby
          </Link>
        </p>
      </header>

      {demoAudience ? (
        <DemoLoginDetailsPanel
          title={
            demoAudience === "school"
              ? "Demo Schools — login details"
              : "Demo Universities — login details"
          }
          accent={demoAudience === "school" ? "school" : "university"}
          slots={demoSlots}
        />
      ) : null}

      {tenantTier ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">{tenantHeading ?? "Active workspaces"}</h2>
          {tenants.length === 0 ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
              {tenantEmpty ?? "No active workspaces for this product line yet."}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {tenants.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/pay/${encodeURIComponent(o.slug)}`}
                    className="block rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 transition hover:border-cyan-400/40"
                  >
                    <p className="text-sm font-semibold text-white">{o.name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{o.slug}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
