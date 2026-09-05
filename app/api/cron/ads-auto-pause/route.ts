import { NextResponse } from "next/server";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { requireCronAuth } from "@/lib/production-secrets";
import { autoPauseExhaustedCampaigns } from "@/lib/ads/service";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    await warmDeploymentEnvCache();
    const cronAuth = requireCronAuth(req);
    if (!cronAuth.ok) return cronAuth.response;
    const { paused } = await autoPauseExhaustedCampaigns();
    return NextResponse.json({ ok: true, paused });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/cron/ads-auto-pause" });
  }
}
