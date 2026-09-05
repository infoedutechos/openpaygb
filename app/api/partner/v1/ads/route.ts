import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePartnerAuth } from "@/lib/partner-auth";
import {
  ensureAdPlatformSettings,
  ensureDefaultAdPlacements,
  parseAdTargeting,
  recordAdModeration,
  stringifyAdTargeting,
} from "@/lib/ads/service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePartnerAuth(req, "ads:read");
    if (!auth.ok) return auth.response;

    await ensureDefaultAdPlacements();
    const where = {
      advertiserKind: "partner" as const,
      advertiserId: auth.partner.keyId,
      ...(auth.partner.organizationId ? { organizationId: auth.partner.organizationId } : {}),
    };
    const [placements, campaigns] = await Promise.all([
      prisma.adPlacement.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
      prisma.adCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { creative: true, placement: true },
      }),
    ]);

    return NextResponse.json({
      placements,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        budgetMinor: c.budgetMinor,
        spentMinor: c.spentMinor,
        impressions: c.impressions,
        clicks: c.clicks,
        targeting: parseAdTargeting(c.targetingJson),
        placement: c.placement,
        creative: c.creative,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/partner/v1/ads" });
  }
}

const CreateBody = z.object({
  name: z.string().min(1).max(200),
  creativeTitle: z.string().min(1).max(200),
  creativeBody: z.string().max(5000).optional().default(""),
  ctaHref: z.string().max(2000).optional().default(""),
  placementId: z.string().min(1),
  budgetMinor: z.number().int().min(0).optional().default(0),
  targeting: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePartnerAuth(req, "ads:write");
    if (!auth.ok) return auth.response;

    const settings = await ensureAdPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "Ads platform is disabled" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await ensureDefaultAdPlacements();
    const placement = await prisma.adPlacement.findUnique({ where: { id: parsed.data.placementId } });
    if (!placement?.isActive) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    const creative = await prisma.adCreative.create({
      data: {
        advertiserKind: "partner",
        advertiserId: auth.partner.keyId,
        organizationId: auth.partner.organizationId,
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
        advertiserKind: "partner",
        advertiserId: auth.partner.keyId,
        organizationId: auth.partner.organizationId,
        creativeId: creative.id,
        placementId: placement.id,
        targetingJson: stringifyAdTargeting((parsed.data.targeting as object) ?? { hubs: ["all"] }),
        budgetMinor: parsed.data.budgetMinor,
        dailyCapMinor: settings.defaultDailyCapMinor,
        approvedAt: status === "approved" ? new Date() : null,
      },
      include: { creative: true, placement: true },
    });

    await recordAdModeration({
      campaignId: campaign.id,
      actorId: auth.partner.keyId,
      action: status === "approved" ? "approve" : "submit",
      note: "Submitted via Partner API",
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/partner/v1/ads" });
  }
}
