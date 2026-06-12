import type { InstitutionTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { listActiveOrganizations, listActiveOrganizationsByTier } from "@/lib/organizations";

/** Public list of active schools for student self-registration (slug + display name only). */
export async function GET(req: Request) {
  const ip = clientIp(req);
  if (rateLimitHit(`public-orgs:${ip}`, 120, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const tierRaw = url.searchParams.get("tier")?.trim().toLowerCase();
  const tier: InstitutionTier | null =
    tierRaw === "school" || tierRaw === "university" ? tierRaw : null;
  const rows = tier ? await listActiveOrganizationsByTier(tier) : await listActiveOrganizations();

  return NextResponse.json(
    {
      organizations: rows.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        institutionTier: o.institutionTier,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
