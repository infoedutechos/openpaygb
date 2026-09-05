import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { getStaffFromCookies } from "@/lib/staff-auth";
import {
  ensureAdPlatformSettings,
  ensureDefaultAdPlacements,
  parseAdTargeting,
  recordAdModeration,
  stringifyAdTargeting,
} from "@/lib/ads/service";

export async function GET() {
  try {
    const staff = await getStaffFromCookies();
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureDefaultAdPlacements();
    const [placements, campaigns] = await Promise.all([
      prisma.adPlacement.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
      prisma.adCampaign.findMany({
        where: { advertiserKind: "staff", advertiserId: staff.sub },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { creative: true, placement: true },
      }),
    ]);

    return NextResponse.json({
      placements,
      campaigns: campaigns.map((c) => ({
        ...c,
        targeting: parseAdTargeting(c.targetingJson),
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/staff/ads" });
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
    const staff = await getStaffFromCookies();
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        advertiserKind: "staff",
        advertiserId: staff.sub,
        organizationId: staff.organizationId,
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
        advertiserKind: "staff",
        advertiserId: staff.sub,
        organizationId: staff.organizationId,
        creativeId: creative.id,
        placementId: placement.id,
        targetingJson: stringifyAdTargeting((parsed.data.targeting as object) ?? { hubs: ["schools"] }),
        budgetMinor: parsed.data.budgetMinor,
        dailyCapMinor: settings.defaultDailyCapMinor,
        approvedAt: status === "approved" ? new Date() : null,
      },
      include: { creative: true, placement: true },
    });

    await recordAdModeration({
      campaignId: campaign.id,
      actorId: staff.sub,
      action: status === "approved" ? "approve" : "submit",
      note: "Submitted from staff ads dashboard",
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/staff/ads" });
  }
}
