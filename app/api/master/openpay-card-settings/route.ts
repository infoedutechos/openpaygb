import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import {
  getOpenPayCardPlatformSettings,
  patchOpenPayCardPlatformSettings,
} from "@/lib/openpay-card-settings";
import { apiErrorResponse } from "@/lib/api-error";

const PatchBody = z.object({
  enabled: z.boolean().optional(),
  issueFeeTon: z.number().positive().max(10_000).optional(),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;
  const settings = await getOpenPayCardPlatformSettings();
  return NextResponse.json(settings);
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

    const settings = await patchOpenPayCardPlatformSettings(parsed.data);
    return NextResponse.json(settings);
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/master/openpay-card-settings" });
  }
}
