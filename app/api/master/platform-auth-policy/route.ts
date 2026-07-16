import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import {
  AuthPolicyPatchSchema,
  getPlatformAuthPolicy,
  savePlatformAuthPolicy,
} from "@/lib/platform-customisation";

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;
    const policy = await getPlatformAuthPolicy();
    return NextResponse.json({ policy });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/platform-auth-policy",
      fallback: "Could not load auth policy",
    });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;
    const json = await req.json().catch(() => null);
    const parsed = AuthPolicyPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const policy = await savePlatformAuthPolicy(parsed.data);
    return NextResponse.json({ policy });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "PATCH /api/master/platform-auth-policy",
      fallback: "Could not save auth policy",
    });
  }
}
