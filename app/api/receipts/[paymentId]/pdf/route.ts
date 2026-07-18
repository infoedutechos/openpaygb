import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { isValidObjectId } from "@/lib/object-id";
import { buildStudentProgrammeProgress, getProgrammeDurationSummary } from "@/lib/tuition-progress";
import { academicPeriodLabels, receiptYearPeriodLabel } from "@/lib/academic-period";
import { buildReceiptBreakdown } from "@/lib/receipt-lines";
import { buildReceiptLedger, formatLedgerDateDisplay } from "@/lib/receipt-ledger";
import { receiptAccessFromRequest } from "@/lib/receipt-request-auth";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: Request, ctx: { params: Promise<{ paymentId: string }> }) {
  try {
  if (rateLimitHit(`receipt-pdf:${clientIp(req)}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { paymentId } = await ctx.params;
  if (!isValidObjectId(paymentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const admin = await getAdminFromCookies();
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { select: { id: true, name: true } } },
  });

  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (payment.status !== "confirmed" && !admin) {
    return NextResponse.json({ error: "Receipt not available until confirmed" }, { status: 404 });
  }
  if (payment.status === "confirmed" && !(await receiptAccessFromRequest(payment, req))) {
    return NextResponse.json({ error: "Receipt not available" }, { status: 404 });
  }

  const issuedAt = payment.confirmedAt ?? payment.createdAt;

  const programme = await prisma.programme.findUnique({
    where: { organizationId_code: { organizationId: payment.organizationId, code: payment.programmeCode } },
    include: { fees: true },
  });
  const studentPayments = programme
    ? await prisma.payment.findMany({
        where: {
          studentId: payment.student.id,
          programmeCode: payment.programmeCode,
          organizationId: payment.organizationId,
        },
      })
    : [];
  const progress = programme ? buildStudentProgrammeProgress(programme, studentPayments) : null;
  const duration = programme ? getProgrammeDurationSummary(programme) : null;
  const organization = await prisma.organization.findUnique({
    where: { id: payment.organizationId },
    select: { name: true, institutionTier: true },
  });
  const institutionTier = organization?.institutionTier;
  const breakdown = buildReceiptBreakdown(payment, programme?.fees ?? [], institutionTier);
  const ledger = buildReceiptLedger({
    organizationName: organization?.name ?? "ODEL HUB",
    studentName: payment.student.name ?? "Student",
    programmeName: programme?.name ?? payment.programmeCode,
    programmeCode: payment.programmeCode,
    payments: studentPayments,
    programmeFees: programme?.fees ?? [],
    focusPaymentId: paymentId,
    institutionTier,
  });
  const { getReceiptBranding } = await import("@/lib/receipt-branding");
  const branding = await getReceiptBranding(payment.organizationId);
  const schoolReceiptNo = payment.schoolReceiptNo?.trim() || null;
  const displayReceiptNo =
    schoolReceiptNo ||
    (() => {
      const year = new Date(issuedAt).getFullYear();
      const seq = parseInt(payment.id.slice(-6), 16) % 1_000_000;
      return `ODEL/${year}/${String(seq).padStart(6, "0")}`;
    })();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, Math.max(595, 360 + ledger.rows.length * 12)]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  async function tryEmbedLogo(bytes: Buffer | Uint8Array | null | undefined) {
    if (!bytes?.length) return null;
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    try {
      if (buf[0] === 0xff && buf[1] === 0xd8) return await pdf.embedJpg(buf);
      if (buf[0] === 0x89 && buf[1] === 0x50) return await pdf.embedPng(buf);
    } catch {
      return null;
    }
    return null;
  }

  const { getPlatformLogoRecord } = await import("@/lib/platform-logo");
  const platformLogoRec = await getPlatformLogoRecord();
  const orgLogo = await prisma.organization.findUnique({
    where: { id: payment.organizationId },
    select: { letterheadLogo: true, faviconIco: true },
  });
  const platformImg = await tryEmbedLogo(platformLogoRec.bytes);
  const schoolImg =
    (await tryEmbedLogo(orgLogo?.letterheadLogo ?? null)) ??
    (await tryEmbedLogo(orgLogo?.faviconIco ?? null));

  let y = 560;
  const left = 40;
  const line = (text: string, size = 10, useBold = false, color = rgb(0.1, 0.1, 0.12)) => {
    page.drawText(text.slice(0, 110), { x: left, y, size, font: useBold ? bold : font, color });
    y -= size + 6;
  };

  if (platformImg) {
    const h = 36;
    const w = (platformImg.width / platformImg.height) * h;
    page.drawImage(platformImg, { x: left, y: y - h + 8, width: Math.min(w, 80), height: h });
    y -= h + 4;
  }
  line(branding.platform.name, 14, true);
  if (branding.platform.phone || branding.platform.email) {
    line(
      [branding.platform.phone, branding.platform.email].filter(Boolean).join(" · "),
      8,
      false,
      rgb(0.35, 0.35, 0.38),
    );
  }
  if (schoolImg) {
    const h = 32;
    const w = (schoolImg.width / schoolImg.height) * h;
    page.drawImage(schoolImg, { x: left, y: y - h + 6, width: Math.min(w, 72), height: h });
    y -= h + 4;
  }
  line(branding.school.name, 12, true);
  const schoolContact = [
    branding.school.phone,
    branding.school.email,
    branding.school.address,
    branding.school.website,
  ]
    .filter(Boolean)
    .join(" · ");
  if (schoolContact) {
    line(schoolContact, 8, false, rgb(0.35, 0.35, 0.38));
  }
  line("Ledger Account · Official receipt", 9, false, rgb(0.35, 0.35, 0.38));
  line(`Receipt No: ${displayReceiptNo}`, 10, true);
  y -= 8;
  line(`Student: ${payment.student.name}`, 10, true);
  if (programme?.name) {
    line(`Programme: ${programme.name} (${payment.programmeCode})`, 10);
  } else {
    line(`Programme: ${payment.programmeCode}`, 10);
  }
  const periodLabels = academicPeriodLabels(institutionTier);
  if (duration && duration.durationYears > 0) {
    line(
      `Period: Year ${payment.year} of ${duration.durationYears} · ${periodLabels.periodOption(payment.semester)} of ${duration.semestersPerYear}`,
      10
    );
  } else {
    line(`Period: Year ${payment.year} · ${periodLabels.periodOption(payment.semester)}`, 10);
  }
  y -= 4;
  line("Ledger account", 11, true);
  const cols = [left, left + 52, left + 72, left + 220, left + 300, left + 360, left + 430, left + 500];
  const drawRow = (cells: string[], boldRow = false) => {
    const f = boldRow ? bold : font;
    cells.forEach((c, i) => {
      page.drawText(c.slice(0, 24), { x: cols[i]!, y, size: 8, font: f, color: rgb(0.15, 0.15, 0.18) });
    });
    y -= 10;
  };
  drawRow(["Date", "Dr/Cr", "Particulars", "Vch Type", "Vch No", "Debit", "Credit"], true);
  for (const row of ledger.rows) {
    const debit = row.debitUgx > 0 ? row.debitUgx.toLocaleString() : "";
    const credit = row.creditUgx > 0 ? row.creditUgx.toLocaleString() : "";
    drawRow([
      formatLedgerDateDisplay(row.date),
      row.crDr,
      row.particulars.slice(0, 28),
      row.vchType,
      row.vchNo,
      debit,
      credit,
    ]);
  }
  drawRow(["", "", "Totals", "", "", ledger.totalDebitUgx.toLocaleString(), ledger.totalCreditUgx.toLocaleString()], true);
  y -= 6;
  line("Fee breakdown (this payment)", 11, true);
  if (breakdown.installmentLabel) {
    line(breakdown.installmentLabel, 9, false, rgb(0.45, 0.35, 0.1));
  }
  for (const feeLine of breakdown.lines) {
    const yr = receiptYearPeriodLabel(feeLine.year, feeLine.semester, institutionTier);
    const meta = [feeLine.recurrenceLabel, yr].filter(Boolean).join(" · ");
    line(
      `${feeLine.label} — tuition ${feeLine.tuitionUgx.toLocaleString()} · functional ${feeLine.functionalFeesUgx.toLocaleString()} · line ${feeLine.lineTotalUgx.toLocaleString()}`,
      8,
      false,
      rgb(0.2, 0.2, 0.24),
    );
    if (meta.trim()) {
      line(`  ${meta}`, 7, false, rgb(0.45, 0.45, 0.48));
    }
  }
  y -= 2;
  line(`Fees subtotal (UGX): ${breakdown.subtotalUgx.toLocaleString()}`, 9);
  line(`  Fees: ${breakdown.subtotalTuitionUgx.toLocaleString()} · Other Requirements: ${breakdown.subtotalFunctionalUgx.toLocaleString()}`, 8, false, rgb(0.35, 0.35, 0.38));
  if (breakdown.platformFeeUgx > 0) {
    line(`Processing / transaction fee (UGX): ${breakdown.platformFeeUgx.toLocaleString()}`, 9);
  }
  line(`Total (UGX): ${breakdown.totalUgx.toLocaleString()}`, 10, true);
  line(
    `TON paid: ${breakdown.tonAmount.toFixed(4)} @ snapshot 1 TON = UGX ${payment.ugxPerTonSnapshot.toLocaleString()}`,
    10,
  );
  y -= 4;

  if (progress && progress.totalSemesters > 0) {
    line("Programme completion", 11, true);
    line(
      `Semesters completed: ${progress.completedSemesters} of ${progress.totalSemesters} · remaining: ${progress.remainingSemesters}`,
      9
    );
    line(
      `Academic years completed: ${progress.completedYears} of ${progress.durationYears} · remaining: ${progress.remainingYears}`,
      9
    );
    y -= 2;
  }

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
  } catch (e) {
    return apiErrorResponse(e, { route: "receipts/pdf", fallback: "Could not generate receipt PDF" });
  }
}
