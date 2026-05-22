import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentRail } from "@prisma/client";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { upsertCheckoutStudent } from "@/lib/checkout-student";
import { createPendingPayment } from "@/lib/create-payment";
import { assertCanStartCheckoutPayment } from "@/lib/tuition-balance";
import { initiateMomoCollect } from "@/lib/momo/collect";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  organizationSlug: z.string().min(2).optional(),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  programmeCode: z.string().min(2),
  year: z.number().int().min(1).max(6),
  semester: z.number().int().min(1).max(3),
  feeSelectionMode: z.enum(["semester", "year"]).optional(),
  installmentCount: z.number().int().min(1).max(4).optional(),
});

/**
 * MoMo bridge payment: upsert student, guarded pending payment, optional provider collect.
 * Prefer `/api/public/checkout/mbiyo-start` or web checkout for tuition hub tenants.
 */
export async function POST(req: Request) {
  if (rateLimitHit(`collect-momo:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const slug = (d.organizationSlug ?? "default").trim().toLowerCase();

  try {
    const org = await assertActiveOrganizationSlug(slug);

    const { student } = await upsertCheckoutStudent({
      organizationId: org.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
    });

    const guard = await assertCanStartCheckoutPayment({
      studentId: student.id,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
      feeSelectionMode: d.feeSelectionMode ?? "semester",
    });
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: 409 });
    }

    const paymentResult = await createPendingPayment({
      studentId: student.id,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
      rail: PaymentRail.momo_bridge,
      feeSelectionMode: d.feeSelectionMode,
      installmentCount: d.installmentCount,
      installmentIndex: 1,
    });

    const collect = await initiateMomoCollect({
      paymentId: paymentResult.id,
      amountUgx: paymentResult.totalUgx,
      phoneSubscriber: d.phone?.trim() || "",
      payerMessage: paymentResult.memo,
    });

    return NextResponse.json(
      {
        payment: {
          id: paymentResult.id,
          studentId: student.id,
          totalUgx: paymentResult.totalUgx,
          tonAmount: paymentResult.tonAmount,
          momoReference: paymentResult.id,
          status: paymentResult.status,
          rail: paymentResult.rail,
          memo: paymentResult.memo,
        },
        collect: {
          ok: collect.ok,
          message: collect.note,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not start MoMo payment";
    const status =
      msg.includes("not active") || msg.includes("not found") ? 404 : msg.includes("Invalid") ? 400 : 500;
    if (status === 500) console.error("[collect/momo]", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
