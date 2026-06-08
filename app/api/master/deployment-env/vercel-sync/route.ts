import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import { refreshDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { autodiscoverDeploymentEnvRegistry } from "@/lib/deployment-env-autodiscover";
import { syncDeploymentEnvToVercel } from "@/lib/deployment-env-vercel-sync";
import { getDeploymentEnvStatus } from "@/lib/deployment-env-status";

/** Master Admin: manually push merged env to Vercel and refresh registry from codebase. */
export async function POST() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    await refreshDeploymentEnvCache();
    const registry = await autodiscoverDeploymentEnvRegistry();
    const vercel = await syncDeploymentEnvToVercel();
    const status = await getDeploymentEnvStatus();

    return NextResponse.json({
      ok: vercel.ok,
      registry,
      vercel,
      status,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/deployment-env/vercel-sync" });
  }
}
