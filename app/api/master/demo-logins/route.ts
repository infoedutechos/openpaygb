import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import {
  DEMO_LOGIN_SLOT_KEYS,
  applyDemoLoginPatches,
  listDemoLoginsForMaster,
} from "@/lib/demo-logins";

const PatchItem = z.object({
  key: z.enum(DEMO_LOGIN_SLOT_KEYS),
  email: z.string().email().optional(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(10).max(128).optional().or(z.literal("")),
  provisionIfMissing: z.boolean().optional(),
});

const PatchBody = z.object({
  slots: z.array(PatchItem).min(1).max(10),
});

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const slots = await listDemoLoginsForMaster();
    return NextResponse.json({
      slots,
      note: "Passwords are never returned. Leave password blank to keep the current hash. Changes also sync SEED_* deployment-env overrides for the next seed.",
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/demo-logins",
      fallback: "Could not load demo logins",
    });
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

    const patches = parsed.data.slots.map((s) => ({
      key: s.key,
      email: s.email,
      name: s.name,
      password: s.password?.trim() ? s.password : undefined,
      provisionIfMissing: s.provisionIfMissing,
    }));

    const result = await applyDemoLoginPatches(patches, {
      updatedBy: gate.user.email ?? gate.user.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      slots: result.slots,
      updated: result.updated,
      messages: result.messages,
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "PATCH /api/master/demo-logins",
      fallback: "Could not update demo logins",
    });
  }
}
