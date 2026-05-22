import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { paymentToPartnerPayload } from "@/lib/mobile-money-provider-webhook";
import type { Payment, Programme, ProgrammeFee } from "@prisma/client";
/** Partner API — list payments (scoped to API key organization). */
export async function GET(req: Request) {
  const gate = await requirePartnerAuth(req, "payments:read");
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() ?? "";
  const since = url.searchParams.get("since")?.trim() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);

  const where: {
    organizationId?: string;
    status?: "pending" | "confirmed" | "failed" | "refunded";
    createdAt?: { gte: Date };
  } = {};

  if (gate.partner.organizationId) {
    where.organizationId = gate.partner.organizationId;
  }

  if (status && ["pending", "confirmed", "failed", "refunded"].includes(status)) {
    where.status = status as "pending" | "confirmed" | "failed" | "refunded";
  }

  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) where.createdAt = { gte: d };
  }

  const rows = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { organization: { select: { slug: true, name: true } } },
  });

  if (rows.length === 0) {
    return NextResponse.json({ payments: [] });
  }

  /** Batch-load programmes + per-student payments so we can embed completion progress without N+1. */
  const programmeKeys = Array.from(
    new Map(rows.map((r) => [`${r.organizationId}::${r.programmeCode}`, { organizationId: r.organizationId, code: r.programmeCode }])).values(),
  );
  const programmes = await prisma.programme.findMany({
    where: { OR: programmeKeys },
    include: { fees: true },
  });
  const programmeByKey = new Map<string, Programme & { fees: ProgrammeFee[] }>(
    programmes.map((p) => [`${p.organizationId}::${p.code}`, p]),
  );

  const studentKeys = Array.from(
    new Map(rows.map((r) => [`${r.studentId}::${r.programmeCode}`, { studentId: r.studentId, programmeCode: r.programmeCode, organizationId: r.organizationId }])).values(),
  );
  const studentPayments = await prisma.payment.findMany({ where: { OR: studentKeys } });
  const paymentsByStudentProg = new Map<string, Payment[]>();
  for (const sp of studentPayments) {
    const key = `${sp.studentId}::${sp.programmeCode}`;
    paymentsByStudentProg.set(key, [...(paymentsByStudentProg.get(key) ?? []), sp]);
  }

  return NextResponse.json({
    payments: rows.map((p) =>
      paymentToPartnerPayload(p, {
        programme: programmeByKey.get(`${p.organizationId}::${p.programmeCode}`) ?? null,
        studentPayments: paymentsByStudentProg.get(`${p.studentId}::${p.programmeCode}`) ?? [],
      }),
    ),
  });
}
