import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/master-session";
import { getDeploymentEnvStatus } from "@/lib/deployment-env-status";
import { apiErrorResponse } from "@/lib/api-error";

/** Master-only deployment environment audit (values masked; never returns secrets). */
export async function GET(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const probe = new URL(req.url).searchParams.get("probe") === "1";
    const status = await getDeploymentEnvStatus({ probe });
    return NextResponse.json(status);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/deployment-env" });
  }
}
