import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { serializeMerchantCharge } from "@/lib/merchant-charge";
import { isValidObjectId } from "@/lib/object-id";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requirePartnerAuth(req, "charges:read");
    if (!gate.ok) return gate.response;

    const { id } = await ctx.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid charge id" }, { status: 400 });
    }

    const key = await prisma.partnerApiKey.findUnique({
      where: { id: gate.partner.keyId },
      select: { developerAppId: true },
    });
    if (!key?.developerAppId) {
      return NextResponse.json({ error: "API key not linked to a developer app" }, { status: 403 });
    }

    const charge = await prisma.merchantCharge.findFirst({
      where: { id, developerAppId: key.developerAppId },
    });
    if (!charge) return NextResponse.json({ error: "Charge not found" }, { status: 404 });

    return NextResponse.json({ charge: serializeMerchantCharge(charge, { includePrivate: true }) });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/partner/v1/charges/[id]" });
  }
}
