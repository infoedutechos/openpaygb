import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { suggestCopilotQueries } from "@/lib/knowledge-base/copilot-reply";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    if (rateLimitHit(`platform-chat-suggest:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const hubParam = url.searchParams.get("hub");
    const hub: PlatformHub =
      hubParam === "tuition" || hubParam === "play" || hubParam === "admin" ? hubParam : "all";

    const suggestions = await suggestCopilotQueries(q, hub);
    return NextResponse.json({ suggestions });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/platform/chat/suggest" });
  }
}
