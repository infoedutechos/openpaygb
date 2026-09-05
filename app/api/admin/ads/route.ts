import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import {
  ensureAdPlatformSettings,
  ensureDefaultAdPlacements,
  parseAdTargeting,
  recordAdModeration,
  stringifyAdTargeting,
} from "@/lib/ads/service";

/** Org/school advertiser: list + create campaigns (submit for MAC review). */
export async function GET(req: NextRequest) {
  try {
    const organizationSlug = req.nextUrl.searchParams.get("organizationSlug") ?? undefined;
    const auth = await requireSchoolAdminScope(organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await ensureDefaultAdPlacements();
    const [placements, campaigns, settings] = await Promise.all([
      prisma.adPlacement.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
      prisma.adCampaign.findMany({
        where: { organizationId: auth.scope.organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { creative: true, placement: true },
      }),
      ensureAdPlatformSettings(),
    ]);

    return NextResponse.json({
      settings: { enabled: settings.enabled, requireMasterApproval: settings.requireMasterApproval },
      placements,
      campaigns: campaigns.map((c) => ({
        ...c,
        targeting: parseAdTargeting(c.targetingJson),
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/ads" });
  }
}

const CreateBody = z.object({
  organizationSlug: z.string().optional(),
  name: z.string().min(1).max(200),
  creativeTitle: z.string().min(1).max(200),
  creativeBody: z.string().max(5000).optional().default(""),
  ctaHref: z.string().max(2000).optional().default(""),
  placementId: z.string().min(1),
  budgetMinor: z.number().int().min(0).optional().default(0),
  targeting: z
    .object({
      hubs: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
      organizationIds: z.array(z.string()).optional(),
      institutionTiers: z.array(z.string()).optional(),
      geoCountries: z.array(z.string()).optional(),
      telegramOnly: z.boolean().optional(),
      webOnly: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const auth = await requireSchoolAdminScope(parsed.data.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const settings = await ensureAdPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "Ads platform is disabled" }, { status: 403 });
    }

    await ensureDefaultAdPlacements();
    const placement = await prisma.adPlacement.findUnique({ where: { id: parsed.data.placementId } });
    if (!placement?.isActive) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    const creative = await prisma.adCreative.create({
      data: {
        advertiserKind: "organization",
        advertiserId: auth.scope.organizationId,
        organizationId: auth.scope.organizationId,
        title: parsed.data.creativeTitle.trim(),
        body: parsed.data.creativeBody.trim(),
        ctaHref: parsed.data.ctaHref.trim(),
      },
    });

    const status = settings.requireMasterApproval ? "pending_review" : "approved";
    const campaign = await prisma.adCampaign.create({
      data: {
        name: parsed.data.name.trim(),
        status,
        advertiserKind: "organization",
        advertiserId: auth.scope.organizationId,
        organizationId: auth.scope.organizationId,
        creativeId: creative.id,
        placementId: placement.id,
        targetingJson: stringifyAdTargeting(
          parsed.data.targeting ?? { hubs: ["schools"], roles: ["org_admin", "student"] },
        ),
        budgetMinor: parsed.data.budgetMinor,
        dailyCapMinor: settings.defaultDailyCapMinor,
        approvedAt: status === "approved" ? new Date() : null,
      },
      include: { creative: true, placement: true },
    });

    await recordAdModeration({
      campaignId: campaign.id,
      actorId: auth.admin.sub,
      action: status === "approved" ? "approve" : "submit",
      note: "Submitted from school/org ads dashboard",
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/ads" });
  }
}
