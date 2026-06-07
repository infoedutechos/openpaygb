import { NextResponse } from "next/server";

import { z } from "zod";

import { requireMaster } from "@/lib/master-session";

import { getDeploymentEnvStatus } from "@/lib/deployment-env-status";

import { patchDeploymentEnvOverrides } from "@/lib/deployment-env-overrides";

import {

  invalidateDeploymentEnvCache,

  refreshDeploymentEnvCache,

} from "@/lib/deployment-env-resolve";

import { getMergedDeploymentEnvRegistryNames } from "@/lib/deployment-env-registry";

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

    const probe = new URL(req.url).searchParams.get("probe") === "1";

    const status = await getDeploymentEnvStatus({ probe });

    return NextResponse.json(status);

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



    return NextResponse.json({

      ok: true,

      ...result,

      status,

    });

  } catch (e) {

    return apiErrorResponse(e, { route: "PATCH /api/master/deployment-env" });

  }

}


