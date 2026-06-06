import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { listPlatformNotifications, markNotificationsRead } from "@/lib/platform-notifications";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import {
  PLATFORM_SESSION_COOKIE,
  readerKeyFromSession,
} from "@/lib/platform-reader-key";

const MarkBody = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

function resolveHub(url: URL): PlatformHub {
  const q = url.searchParams.get("hub");
  if (q === "tuition" || q === "play" || q === "admin" || q === "all") return q;
  return "all";
}

async function sessionCookieValue(): Promise<{ key: string; isNew: boolean }> {
  const jar = await cookies();
  const existing = jar.get(PLATFORM_SESSION_COOKIE)?.value?.trim();
  if (existing) return { key: existing, isNew: false };
  return { key: randomUUID(), isNew: true };
}

export async function GET(req: Request) {
  try {
    if (rateLimitHit(`platform-notify-get:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { key, isNew } = await sessionCookieValue();
    const hub = resolveHub(new URL(req.url));
    let notifications: Awaited<ReturnType<typeof listPlatformNotifications>> = [];
    try {
      notifications = await listPlatformNotifications({
        hub,
        readerKey: readerKeyFromSession(key),
      });
    } catch (listErr) {
      console.warn("[GET /api/platform/notifications] list failed, returning empty", listErr);
    }

    const res = NextResponse.json({ notifications, unread: notifications.filter((n) => !n.read).length });
    if (isNew) {
      res.cookies.set(PLATFORM_SESSION_COOKIE, key, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/platform/notifications" });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = MarkBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { key, isNew } = await sessionCookieValue();
    const marked = await markNotificationsRead(readerKeyFromSession(key), parsed.data.ids);

    const res = NextResponse.json({ ok: true, marked });
    if (isNew) {
      res.cookies.set(PLATFORM_SESSION_COOKIE, key, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/platform/notifications" });
  }
}
