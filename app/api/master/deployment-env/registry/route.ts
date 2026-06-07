import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import {
  createCustomRegistryEntry,
  deleteCustomRegistryEntry,
  listCustomRegistryEntries,
} from "@/lib/deployment-env-custom-registry";
import { invalidateDeploymentEnvCache, refreshDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { getDeploymentEnvStatus } from "@/lib/deployment-env-status";

const CreateBody = z.object({
  name: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  sensitive: z.boolean().optional().default(true),
  requirement: z.enum(["always", "production", "optional"]).optional().default("optional"),
});

const DeleteBody = z.object({
  name: z.string().min(1).max(64),
});

/** Master Admin: list / add / remove custom deployment env registry entries. */
export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const entries = await listCustomRegistryEntries();
    return NextResponse.json({ entries });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/deployment-env/registry" });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const entry = await createCustomRegistryEntry({
      ...parsed.data,
      createdBy: gate.user.email,
    });

    invalidateDeploymentEnvCache();
    await refreshDeploymentEnvCache();
    const status = await getDeploymentEnvStatus();

    return NextResponse.json({ ok: true, entry, status }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    const status = /already in/i.test(msg) ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = DeleteBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const result = await deleteCustomRegistryEntry(parsed.data.name);

    invalidateDeploymentEnvCache();
    await refreshDeploymentEnvCache();
    const status = await getDeploymentEnvStatus();

    return NextResponse.json({ ok: true, ...result, status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
