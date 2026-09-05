import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import {
  ensureAdPlatformSettings,
  ensureDefaultAdPlacements,
  getAdsAnalyticsSummary,
  parseAdTargeting,
  recordAdModeration,
  stringifyAdTargeting,
} from "@/lib/ads/service";
import { AD_ADVERTISER_KINDS, AD_CREATIVE_FORMATS } from "@/lib/ads/types";

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const [settings, placements, creatives, campaigns, analytics] = await Promise.all([
      ensureAdPlatformSettings(),
      ensureDefaultAdPlacements(),
      prisma.adCreative.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.adCampaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { creative: true, placement: true },
      }),
      getAdsAnalyticsSummary(),
    ]);

    return NextResponse.json({
      settings,
      placements,
      creatives,
      campaigns: campaigns.map((c) => ({
        ...c,
        targeting: parseAdTargeting(c.targetingJson),
        startsAt: c.startsAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
        approvedAt: c.approvedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      analytics,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/ads" });
  }
}

const CreateCampaignBody = z.object({
  name: z.string().min(1).max(200),
  creativeTitle: z.string().min(1).max(200),
  creativeBody: z.string().max(5000).optional().default(""),
  creativeFormat: z.enum(AD_CREATIVE_FORMATS).optional().default("text"),
  imageUrl: z.string().max(2000).optional().nullable(),
  videoUrl: z.string().max(2000).optional().nullable(),
  ctaLabel: z.string().max(80).optional().default("Learn more"),
  ctaHref: z.string().max(2000).optional().default(""),
  placementId: z.string().min(1),
  budgetMinor: z.number().int().min(0).optional().default(0),
  dailyCapMinor: z.number().int().min(0).optional().default(0),
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
    .optional()
    .default({}),
  advertiserKind: z.enum(AD_ADVERTISER_KINDS).optional().default("master"),
  submitForReview: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    await ensureDefaultAdPlacements();
    const json = await req.json().catch(() => null);
    const parsed = CreateCampaignBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const placement = await prisma.adPlacement.findUnique({ where: { id: body.placementId } });
    if (!placement || !placement.isActive) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    const settings = await ensureAdPlatformSettings();
    const creative = await prisma.adCreative.create({
      data: {
        advertiserKind: body.advertiserKind,
        advertiserId: gate.user.id,
        title: body.creativeTitle.trim(),
        body: body.creativeBody.trim(),
        format: body.creativeFormat,
        imageUrl: body.imageUrl?.trim() || null,
        videoUrl: body.videoUrl?.trim() || null,
        ctaLabel: body.ctaLabel.trim() || "Learn more",
        ctaHref: body.ctaHref.trim(),
      },
    });

    const autoApprove = settings.autoApproveTrusted && !settings.requireMasterApproval;
    const status = autoApprove
      ? "approved"
      : body.submitForReview
        ? "pending_review"
        : "draft";

    const campaign = await prisma.adCampaign.create({
      data: {
        name: body.name.trim(),
        status,
        advertiserKind: body.advertiserKind,
        advertiserId: gate.user.id,
        creativeId: creative.id,
        placementId: placement.id,
        targetingJson: stringifyAdTargeting(body.targeting),
        budgetMinor: body.budgetMinor,
        dailyCapMinor: body.dailyCapMinor || settings.defaultDailyCapMinor,
        approvedAt: autoApprove ? new Date() : null,
        approvedById: autoApprove ? gate.user.id : null,
      },
      include: { creative: true, placement: true },
    });

    await recordAdModeration({
      campaignId: campaign.id,
      actorId: gate.user.id,
      action: autoApprove ? "approve" : body.submitForReview ? "submit" : "draft",
      note: "Created from MAC Ads console",
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/ads" });
  }
}

const PatchSettingsBody = z.object({
  settings: z
    .object({
      enabled: z.boolean().optional(),
      autoApproveTrusted: z.boolean().optional(),
      requireMasterApproval: z.boolean().optional(),
      platformFeeBps: z.number().int().min(0).max(10_000).optional(),
      minBudgetMinor: z.number().int().min(0).optional(),
      defaultDailyCapMinor: z.number().int().min(0).optional(),
      telegramDeliveryEnabled: z.boolean().optional(),
      webDeliveryEnabled: z.boolean().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = PatchSettingsBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    await ensureAdPlatformSettings();
    const settings = await prisma.adPlatformSettings.update({
      where: { key: "platform" },
      data: parsed.data.settings ?? {},
    });
    return NextResponse.json({ settings });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/master/ads" });
  }
}
