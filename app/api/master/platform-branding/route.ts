import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import {
  BrandingPatchSchema,
  getPlatformBranding,
  savePlatformBranding,
} from "@/lib/platform-customisation";
import { invalidatePublicSiteUiCache } from "@/lib/site-ui-settings";

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;
    const branding = await getPlatformBranding();
    return NextResponse.json({ branding });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/platform-branding",
      fallback: "Could not load branding",
    });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;
    const json = await req.json().catch(() => null);
    const parsed = BrandingPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const branding = await savePlatformBranding(parsed.data);
    invalidatePublicSiteUiCache();
    return NextResponse.json({ branding });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "PATCH /api/master/platform-branding",
      fallback: "Could not save branding",
    });
  }
}
