import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { paymentToPartnerPayload } from "@/lib/mobile-money-provider-webhook";
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

  return NextResponse.json({
    payments: rows.map((p) => paymentToPartnerPayload(p)),
  });
}
