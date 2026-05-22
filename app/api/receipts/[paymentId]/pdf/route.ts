import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { isValidObjectId } from "@/lib/object-id";

export async function GET(_req: Request, ctx: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await ctx.params;
  if (!isValidObjectId(paymentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const admin = await getAdminFromCookies();
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { select: { name: true } } },
  });

  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (payment.status !== "confirmed" && !admin) {
    return NextResponse.json({ error: "Receipt not available until confirmed" }, { status: 404 });
  }

  const issuedAt = payment.confirmedAt ?? payment.createdAt;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 540;
  const left = 48;
  const line = (text: string, size = 10, useBold = false, color = rgb(0.1, 0.1, 0.12)) => {
    page.drawText(text, { x: left, y, size, font: useBold ? bold : font, color });
    y -= size + 6;
  };

  line("ODEL HUB — TON Pay", 14, true);
  line("Tuition waiver program · Official receipt", 9, false, rgb(0.35, 0.35, 0.38));
  y -= 8;
  line(`Student: ${payment.student.name}`, 10, true);
  line(
    `Programme: ${payment.programmeCode} · Year ${payment.year} · Semester ${payment.semester}`,
    10
  );
  y -= 4;
  line(`Tuition (UGX): ${payment.tuitionUgx.toLocaleString()}`, 10);
  line(`Functional fees (UGX): ${payment.functionalFeesUgx.toLocaleString()}`, 10);
  const platformUgx = payment.platformFeeUgx ?? 0;
  if (platformUgx > 0) {
    line(`Processing / transaction fee (UGX): ${platformUgx.toLocaleString()}`, 10);
  }
  line(`Total (UGX): ${payment.totalUgx.toLocaleString()}`, 10, true);
  line(
    `TON paid: ${payment.tonAmount} @ snapshot 1 TON = UGX ${payment.ugxPerTonSnapshot.toLocaleString()}`,
    10
  );
  line(`Transaction hash: ${payment.txHash || "—"}`, 9, false, rgb(0.25, 0.25, 0.28));
  line(`Issued: ${issuedAt ? new Date(issuedAt).toISOString() : "—"}`, 9);
  line(`Payment id: ${payment.id}`, 8, false, rgb(0.4, 0.4, 0.42));

  const bytes = await pdf.save();
  const body = new Blob([Buffer.from(bytes)], { type: "application/pdf" });
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="odelhub-receipt-${paymentId}.pdf"`,
    },
  });
}
