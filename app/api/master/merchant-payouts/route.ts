import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { getAdminFromCookies } from "@/lib/auth";
import {
  markMerchantPayoutPaid,
  rejectMerchantPayout,
  serializeMerchantPayout,
} from "@/lib/merchant-payout";

/** Master ops: list pending merchant cashouts. */
export async function GET() {
  try {
    const admin = await getAdminFromCookies();
    if (!admin || admin.role !== "master") {
      return NextResponse.json({ error: "Master only" }, { status: 403 });
    }

    const rows = await prisma.merchantPayout.findMany({
      where: { status: { in: ["pending", "paid", "rejected"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        developerApp: { select: { name: true, slug: true, contactEmail: true } },
      },
    });

    return NextResponse.json({
      payouts: rows.map((r) => ({
        ...serializeMerchantPayout(r),
        appName: r.developerApp.name,
        appSlug: r.developerApp.slug,
        contactEmail: r.developerApp.contactEmail,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/merchant-payouts" });
  }
}

const Body = z.object({
  payoutId: z.string().min(1),
  action: z.enum(["mark_paid", "reject"]),
  reason: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin || admin.role !== "master") {
      return NextResponse.json({ error: "Master only" }, { status: 403 });
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (parsed.data.action === "mark_paid") {
      const row = await markMerchantPayoutPaid(parsed.data.payoutId);
      return NextResponse.json({ payout: serializeMerchantPayout(row) });
    }

    const row = await rejectMerchantPayout(parsed.data.payoutId, parsed.data.reason ?? "Rejected by master");
    return NextResponse.json({ payout: serializeMerchantPayout(row) });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/merchant-payouts" });
  }
}
