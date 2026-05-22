import { NextResponse } from "next/server";
import { z } from "zod";
import { ProgrammeFeeRecurrence } from "@prisma/client";
import { findProgrammeByCode, resolveFeeRowsForSelection, sumFeeRows, type ProgrammeFeeSelectionMode } from "@/lib/programmes";
import { getCheckoutPlatformFeeUgxForOrganization } from "@/lib/checkout-platform-fee";
import { getActiveUgxPerTonForOrganization } from "@/lib/fx";
import { feeTotal, ugxToTon } from "@/lib/money";
import { DEFAULT_TON_WALLET } from "@/lib/constants";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { prisma } from "@/lib/prisma";
import { isValidObjectId } from "@/lib/object-id";
import { PROGRAMME_TRACK_LABEL } from "@/lib/programme-track";
import { getProgrammeDurationSummary, getProgrammePeriodDetails } from "@/lib/tuition-progress";

const Query = z.object({
  year: z.coerce.number().int().min(1).max(6),
  semester: z.coerce.number().int().min(1).max(3),
  feeSelectionMode: z.enum(["semester", "year", "programme"]).optional().default("semester"),
});

function recurrenceLabel(r: ProgrammeFeeRecurrence | null | undefined): string {
  if (r === ProgrammeFeeRecurrence.once) return "Paid once";
  if (r === ProgrammeFeeRecurrence.per_year) return "Per year";
  return "Per semester";
}

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const url = new URL(req.url);
  const feeIdsRaw = url.searchParams.get("feeIds");
  const feeIds = feeIdsRaw
    ? feeIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  if (feeIds?.some((id) => !isValidObjectId(id))) {
    return NextResponse.json({ error: "Invalid feeIds" }, { status: 400 });
  }

  const parsed = Query.safeParse({
    year: url.searchParams.get("year"),
    semester: url.searchParams.get("semester"),
    feeSelectionMode: url.searchParams.get("feeSelectionMode") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "year and semester query required" }, { status: 400 });
  }

  const feeSelectionMode = parsed.data.feeSelectionMode as ProgrammeFeeSelectionMode;

  const slug = url.searchParams.get("orgSlug")?.trim().toLowerCase() ?? "";
  let organizationId: string;
  let destWallet = DEFAULT_TON_WALLET;
  if (slug) {
    const org = await getActiveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "Organization not found or not active" }, { status: 404 });
    }
    organizationId = org.id;
    destWallet = org.destinationWallet?.trim() || DEFAULT_TON_WALLET;
  } else {
    organizationId = await getDefaultOrganizationId();
    const row = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { destinationWallet: true },
    });
    destWallet = row?.destinationWallet?.trim() || DEFAULT_TON_WALLET;
  }

  const p = await findProgrammeByCode(code, organizationId);
  if (!p) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }
  const programmeDuration = getProgrammeDurationSummary(p);
  /** Programme bundle covers every period — the anchor year/semester only label the receipt. */
  if (
    feeSelectionMode !== "programme" &&
    programmeDuration.totalSemesters > 0 &&
    (parsed.data.year > programmeDuration.durationYears || parsed.data.semester > programmeDuration.semestersPerYear)
  ) {
    return NextResponse.json(
      {
        error: `This programme covers ${programmeDuration.durationYears} year(s) and ${programmeDuration.semestersPerYear} semester(s) per year.`,
      },
      { status: 400 },
    );
  }

  let rows;
  let pool;
  try {
    const resolved = resolveFeeRowsForSelection(p.fees, {
      mode: feeSelectionMode,
      year: parsed.data.year,
      semester: parsed.data.semester,
      selectedIds: feeIds,
    });
    rows = resolved.rows;
    pool = resolved.pool;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid selection";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const isFullSelection = rows.length === pool.length && pool.length > 0;

  const { tuitionUgx, functionalFeesUgx } = sumFeeRows(rows);
  if (tuitionUgx === 0 && functionalFeesUgx === 0) {
    return NextResponse.json({ error: "No fee schedule for year/semester" }, { status: 404 });
  }

  const subtotalUgx = feeTotal(tuitionUgx, functionalFeesUgx);
  const platformFeeUgx = await getCheckoutPlatformFeeUgxForOrganization(organizationId);
  const totalUgx = subtotalUgx + platformFeeUgx;
  const { ugxPerTon, source } = await getActiveUgxPerTonForOrganization(organizationId);
  const tonAmount = ugxToTon(totalUgx, ugxPerTon);

  const poolLines = pool.map((r) => ({
    id: r.id,
    feeKey: r.feeKey ?? "default",
    recurrence: r.recurrence ?? ProgrammeFeeRecurrence.per_semester,
    recurrenceLabel: recurrenceLabel(r.recurrence ?? null),
    year: r.year,
    semester: r.semester,
    tuitionUgx: r.tuitionUgx,
    functionalFeesUgx: r.functionalFeesUgx,
    lineTotalUgx: r.tuitionUgx + r.functionalFeesUgx,
  }));

  const lines = rows.map((r) => ({
    id: r.id,
    feeKey: r.feeKey ?? "default",
    recurrence: r.recurrence ?? ProgrammeFeeRecurrence.per_semester,
    recurrenceLabel: recurrenceLabel(r.recurrence ?? null),
    year: r.year,
    semester: r.semester,
    tuitionUgx: r.tuitionUgx,
    functionalFeesUgx: r.functionalFeesUgx,
    lineTotalUgx: r.tuitionUgx + r.functionalFeesUgx,
  }));

  return NextResponse.json({
    programmeCode: p.code,
    programmeName: p.name,
    programmeTrack: p.track,
    programmeTrackLabel: PROGRAMME_TRACK_LABEL[p.track],
    programmeDuration,
    programmePeriods: getProgrammePeriodDetails(p),
    year: parsed.data.year,
    semester: parsed.data.semester,
    feeSelectionMode,
    isFullSelection,
    poolLineCount: pool.length,
    poolLines,
    lines,
    tuitionUgx,
    functionalFeesUgx,
    subtotalUgx,
    platformFeeUgx,
    totalUgx,
    ugxPerTon,
    rateSource: source,
    tonAmount,
    destinationWallet: destWallet,
  });
}
