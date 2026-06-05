import { NextResponse } from "next/server";
import { z } from "zod";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { failPendingPayment } from "@/lib/cancel-pending-payment";
import { assertCheckoutStudentAccess } from "@/lib/checkout-session";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { isValidObjectId } from "@/lib/object-id";

const Body = z.object({
  organizationSlug: z.string().min(2),
  studentId: z.string().min(1),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`checkout-cancel:${ip}`, 40, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await ctx.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await assertActiveOrganizationSlug(parsed.data.organizationSlug.trim().toLowerCase());
    const studentId = parsed.data.studentId.trim();

    const access = await assertCheckoutStudentAccess({
      req,
      studentId,
      organizationId: org.id,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const result = await failPendingPayment({
      paymentId: id,
      studentId,
      organizationId: org.id,
      reason: "user",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "checkout/payment/cancel",
      fallback: "Could not cancel payment",
    });
  }
}
