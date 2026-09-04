import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import { getDeploymentEnvStatus } from "@/lib/deployment-env-status";
import { patchDeploymentEnvOverrides } from "@/lib/deployment-env-overrides";
import {
  invalidateDeploymentEnvCache,
  refreshDeploymentEnvCache,
} from "@/lib/deployment-env-resolve";
import { getMergedDeploymentEnvRegistryNames } from "@/lib/deployment-env-registry";
import { runDeploymentEnvAutonomousTasks, runRegistryAutodiscover } from "@/lib/deployment-env-autonomous";
import { isAutonomousDeploymentEnvSyncEnabled, syncDeploymentEnvToVercel } from "@/lib/deployment-env-vercel-sync";
import { apiErrorResponse } from "@/lib/api-error";



const PatchBody = z.object({

  updates: z.record(z.string().nullable()).optional(),

  clear: z.array(z.string()).max(100).optional(),

});



/** Master deployment environment — audit, save encrypted overrides, optional PSP probe. */

export async function GET(req: Request) {

  try {

    const gate = await requireMaster();

    if (!gate.ok) return gate.response;



    await refreshDeploymentEnvCache();

    const url = new URL(req.url);
    const probe = url.searchParams.get("probe") === "1";
    const skipAutonomous = url.searchParams.get("skipAutonomous") === "1";

    let autonomous: {
      registry: Awaited<ReturnType<typeof runRegistryAutodiscover>>;
      vercel: null;
      vercelPending: boolean;
    } | null = null;

    if (!skipAutonomous) {
      const registry = await runRegistryAutodiscover();
      if (registry.added.length) {
        invalidateDeploymentEnvCache();
        await refreshDeploymentEnvCache();
      }
      const vercelPending = isAutonomousDeploymentEnvSyncEnabled();
      if (vercelPending) {
        after(async () => {
          try {
            await syncDeploymentEnvToVercel();
          } catch (e) {
            console.warn("[deployment-env] background Vercel sync failed", e);
          }
        });
      }
      autonomous = { registry, vercel: null, vercelPending };
    }

    const status = await getDeploymentEnvStatus({ probe });

    return NextResponse.json({ ...status, autonomous });

  } catch (e) {

    return apiErrorResponse(e, { route: "GET /api/master/deployment-env" });

  }

}



export async function PATCH(req: Request) {

  try {

    const gate = await requireMaster();

    if (!gate.ok) return gate.response;



    const json = await req.json().catch(() => null);

    const parsed = PatchBody.safeParse(json);

    if (!parsed.success) {

      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });

    }



    const updates = parsed.data.updates ?? {};
    const allowedNames = new Set(await getMergedDeploymentEnvRegistryNames());

    for (const key of Object.keys(updates)) {
      if (!allowedNames.has(key)) {
        return NextResponse.json({ error: `Unknown variable: ${key}` }, { status: 400 });
      }
    }



    const result = await patchDeploymentEnvOverrides({

      updates,

      clear: parsed.data.clear,

      updatedBy: gate.user.email,

    });



    invalidateDeploymentEnvCache();
    await refreshDeploymentEnvCache();

    const status = await getDeploymentEnvStatus();

    after(async () => {
      try {
        await runDeploymentEnvAutonomousTasks({ syncVercel: true }); // explicit manual/after-save sync
      } catch (e) {
        console.warn("[deployment-env] autonomous Vercel sync after save failed", e);
      }
    });

    return NextResponse.json({
      ok: true,
      ...result,
      status,
      autonomousNote:
        "Saved to Mongo overrides — payment providers use them at runtime (no redeploy). Optional Vercel backup sync runs in the background when VERCEL_ACCESS_TOKEN + VERCEL_PROJECT_ID are set.",
    });

  } catch (e) {

    return apiErrorResponse(e, { route: "PATCH /api/master/deployment-env" });

  }

}


