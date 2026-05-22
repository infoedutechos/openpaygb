import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { normalizeProgrammeTrack } from "@/lib/programme-track";
import { getProgrammeDurationSummary, getProgrammePeriodDetails } from "@/lib/tuition-progress";

export async function GET(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const organizationSlug = url.searchParams.get("organizationSlug")?.trim().toLowerCase() ?? "";
  const onlyUnset = url.searchParams.get("onlyUnset") === "1";

  const orgFilter = organizationSlug
    ? await prisma.organization.findFirst({ where: { slug: organizationSlug }, select: { id: true } })
    : null;

  if (organizationSlug && !orgFilter) {
    return NextResponse.json({ error: "Unknown organization slug" }, { status: 400 });
  }

  const programmes = await prisma.programme.findMany({
    where: orgFilter ? { organizationId: orgFilter.id } : {},
    orderBy: [{ organizationId: "asc" }, { code: "asc" }],
    include: {
      organization: { select: { id: true, slug: true, name: true, tenantStatus: true } },
      fees: { orderBy: [{ year: "asc" }, { semester: "asc" }] },
    },
  });

  const rows = programmes
    .map((p) => {
      const inferred = getProgrammeDurationSummary({ ...p, durationYears: null, semestersPerYear: null });
      const effective = getProgrammeDurationSummary(p);
      const periods = getProgrammePeriodDetails(p);
      const isUnset = (p.durationYears ?? 0) === 0 || (p.semestersPerYear ?? 0) === 0;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        track: normalizeProgrammeTrack(p.track),
        organization: {
          id: p.organization.id,
          slug: p.organization.slug,
          name: p.organization.name,
          tenantStatus: p.organization.tenantStatus,
        },
        durationYears: p.durationYears ?? 0,
        semestersPerYear: p.semestersPerYear ?? 0,
        effectiveDuration: effective,
        inferredDuration: inferred,
        feeCount: p.fees.length,
        periods,
        isUnset,
      };
    })
    .filter((row) => (onlyUnset ? row.isUnset : true));

  return NextResponse.json({ programmes: rows });
}
