import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { recordAdDeliveryEvent, parseAdTargeting, campaignMatchesTargeting } from "@/lib/ads/service";

/**
 * Public serve endpoint for active ads (web dashboards / TMA).
 * Phase 1: returns approved|active campaigns for a placement code; records serve events.
 */
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const placementCode = url.searchParams.get("placement")?.trim() || "web_dashboard_sidebar";
    const hub = url.searchParams.get("hub")?.trim() || "all";

    const placement = await prisma.adPlacement.findUnique({ where: { code: placementCode } });
    if (!placement || !placement.isActive) {
      return NextResponse.json({ ads: [] });
    }

    const settings = await prisma.adPlatformSettings.findUnique({ where: { key: "platform" } });
    if (settings && !settings.enabled) {
      return NextResponse.json({ ads: [] });
    }
    if (settings && !settings.webDeliveryEnabled && placement.surface.startsWith("web")) {
      return NextResponse.json({ ads: [] });
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: {
        placementId: placement.id,
        status: { in: ["active", "approved"] },
      },
      include: { creative: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const now = Date.now();
    const ads = [];
    for (const c of campaigns) {
      if (c.startsAt && c.startsAt.getTime() > now) continue;
      if (c.endsAt && c.endsAt.getTime() < now) continue;
      if (c.budgetMinor > 0 && c.spentMinor >= c.budgetMinor) continue;
      const targeting = parseAdTargeting(c.targetingJson);
      if (targeting.telegramOnly) continue;
      if (
        !campaignMatchesTargeting(targeting, {
          hub,
          organizationId: url.searchParams.get("organizationId") ?? undefined,
          role: url.searchParams.get("role") ?? undefined,
        })
      ) {
        continue;
      }
      ads.push({
        campaignId: c.id,
        title: c.creative.title,
        body: c.creative.body,
        imageUrl: c.creative.imageUrl,
        ctaLabel: c.creative.ctaLabel,
        ctaHref: c.creative.ctaHref,
        format: c.creative.format,
      });
      void recordAdDeliveryEvent({
        campaignId: c.id,
        kind: "serve",
        surface: placement.surface,
      });
    }

    return NextResponse.json({ placement: placement.code, ads });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/ads/serve" });
  }
}

const EventBody = z.object({
  campaignId: z.string().min(1),
  kind: z.enum(["impression", "click"]),
  viewerKey: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = EventBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: parsed.data.campaignId },
      include: { placement: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await recordAdDeliveryEvent({
      campaignId: campaign.id,
      kind: parsed.data.kind,
      surface: campaign.placement.surface,
      viewerKey: parsed.data.viewerKey,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/public/ads/serve" });
  }
}
