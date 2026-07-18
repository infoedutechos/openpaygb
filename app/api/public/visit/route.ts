import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { visitGeoFromHeaders } from "@/lib/visit-geo";
import {
  VISITOR_COOKIE,
  hashVisitorId,
  newVisitorId,
  recordSiteVisit,
} from "@/lib/site-visits";

export const dynamic = "force-dynamic";

const Body = z.object({
  path: z.string().max(200).optional(),
});

/**
 * Visit beacon — privacy:
 * - Never persists raw IP addresses (not in Mongo, not in response).
 * - Rate-limit keys use SHA-256 hashes only.
 * - DB stores hashed visitor cookie id + country/city aggregates.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    const path = parsed.success ? parsed.data.path : undefined;

    const cookieHeader = req.headers.get("cookie") ?? "";
    const existing = /(?:^|;\s*)odelhub_vid=([^;]+)/.exec(cookieHeader)?.[1];
    let visitorRawId = existing ? decodeURIComponent(existing) : "";
    let setCookie = false;
    if (!visitorRawId || visitorRawId.length < 8 || visitorRawId.length > 80) {
      visitorRawId = newVisitorId();
      setCookie = true;
    }

    // Rate-limit by hashed visitor id (never use raw IP as the key).
    // For brand-new cookies, fold a hashed IP into the key so bots without cookies are still throttled.
    const rateKey = setCookie
      ? `site-visit:new:${hashVisitorId(`ip:${clientIp(req)}`)}`
      : `site-visit:${hashVisitorId(visitorRawId)}`;
    if (rateLimitHit(rateKey, 60, 60_000)) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    const geo = visitGeoFromHeaders(req.headers);
    const result = await recordSiteVisit({
      visitorRawId,
      geo,
      path,
    });

    const res = NextResponse.json({
      ok: true,
      day: result.day,
      isNewUniqueToday: result.isNewUniqueToday,
    });

    if (setCookie) {
      res.cookies.set(VISITOR_COOKIE, visitorRawId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 400,
      });
    }

    return res;
  } catch (e) {
    return apiErrorResponse(e, {
      route: "POST /api/public/visit",
      fallback: "Could not record visit",
    });
  }
}
