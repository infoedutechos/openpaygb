import { NextResponse } from "next/server";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { getOpenPayCardMomoPublicConfig } from "@/lib/openpay-card-momo-ready";
import { apiErrorResponse } from "@/lib/api-error";

/** Public: whether OpenPayGB card can activate/fund via MTN/Airtel MoMo (live or sandbox). */
export async function GET() {
  try {
    await warmDeploymentEnvCache();
    const config = await getOpenPayCardMomoPublicConfig();
    return NextResponse.json(config);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/openpay-card-momo-config" });
  }
}
