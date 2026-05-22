import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Seconds to cache active-organization reads (pay pages, public list, checkout guards). */
const ORG_CACHE_REVALIDATE_SEC = 60;

const activeOrgListPublic = unstable_cache(
  async () =>
    prisma.organization.findMany({
      where: { tenantStatus: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ["active-organizations-public"],
  { revalidate: ORG_CACHE_REVALIDATE_SEC, tags: ["organizations"] },
);

function cachedOrgBySlug(slug: string) {
  return unstable_cache(
    async () =>
      prisma.organization.findFirst({
        where: { slug, tenantStatus: "active" },
      }),
    ["active-organization-slug", slug],
    { revalidate: ORG_CACHE_REVALIDATE_SEC, tags: ["organizations", `org:${slug}`] },
  )();
}

export async function listActiveOrganizations() {
  return activeOrgListPublic();
}

export async function getActiveOrganizationBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  return cachedOrgBySlug(normalized);
}

export async function assertActiveOrganizationSlug(slug: string) {
  const org = await getActiveOrganizationBySlug(slug);
  if (!org) {
    throw new Error("Organization not found or not active");
  }
  return org;
}
