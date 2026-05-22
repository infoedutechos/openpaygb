import Link from "next/link";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { isValidObjectId } from "@/lib/object-id";
import { absoluteUrl } from "@/lib/public-url";
import { buildStudentProgrammeProgress, getProgrammeDurationSummary } from "@/lib/tuition-progress";

export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  if (!isValidObjectId(paymentId)) {
    return <p className="text-sm text-rose-400">Invalid receipt id.</p>;
  }
  const admin = await getAdminFromCookies();
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { select: { id: true, name: true } } },
  });
  if (!payment) {
    return <p className="text-sm text-rose-400">Payment not found.</p>;
  }
  if (payment.status !== "confirmed" && !admin) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-amber-300">This payment is still pending. Receipt unlocks after confirmation.</p>
        <Link href="/pay/default" className="text-sm text-sky-400 hover:underline">
          Back to pay flow
        </Link>
      </div>
    );
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
  const duration = programme ? getProgrammeDurationSummary(programme) : null;
  const progress = programme ? buildStudentProgrammeProgress(programme, studentPayments) : null;
  const verifyUrl = absoluteUrl(`/receipt/${paymentId}`);
  let qrDataUrl: string | null = null;
  if (verifyUrl.startsWith("http")) {
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 168,
        margin: 1,
        color: { dark: "#e2e8f0", light: "#0f172a00" },
      });
    } catch {
      qrDataUrl = null;
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 sm:px-0">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-400">Official receipt</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">ODEL HUB</h1>
        <p className="text-sm text-slate-400">TON Pay — tuition waiver program</p>
        <dl className="mt-6 space-y-2 text-sm text-slate-200">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Student</dt>
            <dd>{payment.student.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Programme</dt>
            <dd className="text-right">
              {programme?.name ? <span className="block">{programme.name}</span> : null}
              <span className="block text-slate-300">
                {payment.programmeCode} ·{" "}
                {duration && duration.durationYears > 0
                  ? `Yr ${payment.year} of ${duration.durationYears} · Sem ${payment.semester} of ${duration.semestersPerYear}`
                  : `Yr ${payment.year} · Sem ${payment.semester}`}
              </span>
            </dd>
          </div>
          {progress && progress.totalSemesters > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Programme progress</dt>
              <dd className="text-right text-slate-300">
                {progress.completedSemesters} of {progress.totalSemesters} semesters ·{" "}
                {progress.completedYears} of {progress.durationYears} year
                {progress.durationYears === 1 ? "" : "s"} completed
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Tuition</dt>
            <dd>UGX {payment.tuitionUgx.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Functional</dt>
            <dd>UGX {payment.functionalFeesUgx.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-3 font-semibold">
            <dt className="text-slate-400">Total UGX</dt>
            <dd>UGX {payment.totalUgx.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between gap-4 text-sky-300">
            <dt>TON paid</dt>
            <dd className="font-mono">{payment.tonAmount} TON</dd>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <dt className="text-slate-500">Rate snapshot</dt>
            <dd className="font-mono">1 TON = UGX {payment.ugxPerTonSnapshot.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <dt className="text-slate-500">Tx hash</dt>
            <dd className="break-all font-mono text-slate-300">{payment.txHash || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <dt className="text-slate-500">Issued</dt>
            <dd>{issuedAt ? new Date(issuedAt).toLocaleString() : "—"}</dd>
          </div>
        </dl>
        {qrDataUrl && (
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <p className="text-xs text-slate-500">Verification (scan)</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Receipt verification QR" className="mt-2 h-40 w-40" />
            <p className="mt-2 break-all font-mono text-[10px] text-slate-500">{verifyUrl}</p>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Payment id <span className="font-mono text-slate-400">{payment.id}</span>
        </p>
        <a
          href={`/api/receipts/${paymentId}/pdf`}
          className="mt-4 inline-block text-sm font-semibold text-sky-400 hover:underline"
        >
          Download PDF
        </a>
      </div>
      <Link href="/" className="text-sm text-sky-400 hover:underline">
        ← Home
      </Link>
    </div>
  );
}
