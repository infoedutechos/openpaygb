import { NextResponse } from "next/server";
import { getCachedProgrammesForOrganization } from "@/lib/cached-programmes";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { normalizeProgrammeTrack } from "@/lib/programme-track";
import { getProgrammeDurationSummary, getProgrammePeriodDetails } from "@/lib/tuition-progress";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("orgSlug")?.trim().toLowerCase() ?? "";

  let organizationId: string;
  if (slug) {
    const org = await getActiveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "Organization not found or not active" }, { status: 404 });
    }
    organizationId = org.id;
  } else {
    organizationId = await getDefaultOrganizationId();
  }

  const rows = await getCachedProgrammesForOrganization(organizationId);
  return NextResponse.json(
    {
    programmes: rows.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      track: normalizeProgrammeTrack(p.track),
      durationYears: p.durationYears ?? 0,
      semestersPerYear: p.semestersPerYear ?? 0,
      duration: getProgrammeDurationSummary(p),
      periods: getProgrammePeriodDetails(p),
      feeLines: p._count.fees,
    })),
    organizationSlug: slug || "default",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
