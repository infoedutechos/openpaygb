import { NextResponse } from "next/server";
import { getPlayHubLaunchTargets } from "@/lib/play-hub-launch-store";
import {
  BUILTIN_PLAY_HUB_TARGET_ID,
  publicPlayHubLaunchPayload,
} from "@/lib/play-hub-launch-targets";

/**
 * Canonical Play Hub entry — honors MAC active launch target
 * (Telegram / external / iframe / built-in /clicker).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const forceBuiltin = url.searchParams.get("builtin") === "1";
  const origin = url.origin;

  if (forceBuiltin) {
    return NextResponse.redirect(new URL("/clicker?builtin=1", origin), 302);
  }

  try {
    const payload = publicPlayHubLaunchPayload(await getPlayHubLaunchTargets());
    const active = payload.active;
    if (!active || active.id === BUILTIN_PLAY_HUB_TARGET_ID || active.kind === "internal") {
      const path = active?.url?.startsWith("/") ? active.url : "/clicker";
      return NextResponse.redirect(new URL(path, origin), 302);
    }
    if (active.kind === "iframe" || active.openMode === "iframe") {
      return NextResponse.redirect(new URL("/clicker?launch=iframe", origin), 302);
    }
    return NextResponse.redirect(active.url, 302);
  } catch {
    return NextResponse.redirect(new URL("/clicker", origin), 302);
  }
}
