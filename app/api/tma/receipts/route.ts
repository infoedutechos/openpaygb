import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentFromCookies } from "@/lib/student-auth";
import { createReceiptAccessToken } from "@/lib/receipt-access";
import { absoluteUrl } from "@/lib/public-url";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      where: { studentId: session.sub, organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        status: true,
        totalUgx: true,
        tonAmount: true,
        rail: true,
        programmeCode: true,
        year: true,
        semester: true,
        createdAt: true,
        confirmedAt: true,
      },
    });

    const receipts = payments.map((p) => {
      const token =
        p.status === "confirmed"
          ? createReceiptAccessToken({
              id: p.id,
              studentId: session.sub,
              confirmedAt: p.confirmedAt,
            })
          : null;
      const qs = token ? `?t=${encodeURIComponent(token)}` : "";
      const railLabel =
        p.rail === "openpay_card"
          ? "OpenPay Card"
          : p.rail === "livepay" || p.rail === "mbiyo" || p.rail === "relworx" || p.rail === "vixonpay"
            ? "Mobile Money"
            : p.rail === "telegram"
              ? "Telegram"
              : "TON";
      return {
        id: p.id,
        receiptNumber: `RCP-${p.id.slice(-6).toUpperCase()}`,
        status: p.status,
        amountUgx: p.totalUgx ?? 0,
        tonAmount: p.tonAmount,
        method: railLabel,
        programmeCode: p.programmeCode,
        year: p.year,
        semester: p.semester,
        date: (p.confirmedAt ?? p.createdAt).toISOString(),
        viewUrl: absoluteUrl(`/receipt/${p.id}${qs}`),
        pdfUrl: p.status === "confirmed" ? absoluteUrl(`/api/receipts/${p.id}/pdf${qs}`) : null,
      };
    });

    return NextResponse.json({ receipts });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/tma/receipts", fallback: "Could not load receipts" });
  }
}
