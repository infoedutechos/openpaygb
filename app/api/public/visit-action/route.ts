import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import {
  VISITOR_COOKIE,
  hashVisitorId,
  newVisitorId,
  recordSiteAction,
} from "@/lib/site-visits";

export const dynamic = "force-dynamic";

const Body = z.object({
  path: z.string().max(200).optional(),
  action: z.string().min(1).max(120),
});

/**
 * Action beacon — anonymized UI actions for MAC per-page drill-down.
 * Never stores raw IP; uses hashed visitor cookie id only.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const cookieHeader = req.headers.get("cookie") ?? "";
    const existing = /(?:^|;\s*)odelhub_vid=([^;]+)/.exec(cookieHeader)?.[1];
    let visitorRawId = existing ? decodeURIComponent(existing) : "";
    let setCookie = false;
    if (!visitorRawId || visitorRawId.length < 8 || visitorRawId.length > 80) {
      visitorRawId = newVisitorId();
      setCookie = true;
    }

    const rateKey = setCookie
      ? `site-action:new:${hashVisitorId(`ip:${clientIp(req)}`)}`
      : `site-action:${hashVisitorId(visitorRawId)}`;
    if (rateLimitHit(rateKey, 120, 60_000)) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    const result = await recordSiteAction({
      visitorRawId,
      path: parsed.data.path,
      action: parsed.data.action,
    });

    const res = NextResponse.json({ ok: true, day: result.day });
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
      route: "POST /api/public/visit-action",
      fallback: "Could not record action",
    });
  }
}
