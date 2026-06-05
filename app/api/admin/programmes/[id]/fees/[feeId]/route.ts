import { ProgrammeFeeRecurrence } from "@prisma/client";
import { revalidateProgrammesCache } from "@/lib/cached-programmes";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";
import { feeSlotError, normalizeProgrammeFeeKey } from "@/lib/programme-fee-slot";

async function assertFeeAccess(
  admin: { sub: string; role: "master" | "org_admin" },
  programmeOrgId: string
): Promise<NextResponse | null> {
  if (admin.role === "master") {
    const org = await prisma.organization.findFirst({
      where: { id: programmeOrgId, tenantStatus: "active" },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: "Organization not active" }, { status: 404 });
    return null;
  }
  const w = await organizationWhereForSession(admin.sub, admin.role);
  if (!("organizationId" in w) || w.organizationId !== programmeOrgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const org = await prisma.organization.findFirst({
    where: { id: programmeOrgId },
    select: { tenantStatus: true },
  });
  if (!org || org.tenantStatus !== "active") {
    return NextResponse.json(
      {
        error:
          org?.tenantStatus === "pending"
            ? "Your school workspace is pending master approval."
            : "Your school workspace is not active.",
      },
      { status: 403 },
    );
  }
  return null;
}

const PatchFee = z.object({
  tuitionUgx: z.number().int().min(0).max(50_000_000).optional(),
  functionalFeesUgx: z.number().int().min(0).max(50_000_000).optional(),
  year: z.number().int().min(1).max(6).optional(),
  semester: z.number().int().min(0).max(3).optional(),
  recurrence: z.nativeEnum(ProgrammeFeeRecurrence).optional(),
  feeKey: z.string().max(64).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; feeId: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: programmeId, feeId } = await ctx.params;
  if (!isValidObjectId(programmeId) || !isValidObjectId(feeId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const fee = await prisma.programmeFee.findFirst({
    where: { id: feeId, programmeId },
    include: { programme: { select: { organizationId: true } } },
  });
  if (!fee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gate = await assertFeeAccess(admin, fee.programme.organizationId);
  if (gate) return gate;

  const json = await req.json().catch(() => null);
  const parsed = PatchFee.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const nextRecurrence = parsed.data.recurrence ?? fee.recurrence;
  const nextSemester = parsed.data.semester ?? fee.semester;
  const nextFeeKey =
    parsed.data.feeKey !== undefined ? normalizeProgrammeFeeKey(parsed.data.feeKey) : fee.feeKey;

  const slotErr = feeSlotError(nextRecurrence, nextSemester);
  if (slotErr) {
    return NextResponse.json({ error: slotErr }, { status: 400 });
  }
  if (nextFeeKey !== "default" && !/^[a-zA-Z0-9_-]+$/.test(nextFeeKey)) {
    return NextResponse.json({ error: "feeKey: use letters, numbers, hyphen or underscore" }, { status: 400 });
  }

  const data: {
    tuitionUgx?: number;
    functionalFeesUgx?: number;
    year?: number;
    semester?: number;
    recurrence?: ProgrammeFeeRecurrence;
    feeKey?: string;
  } = {};
  if (parsed.data.tuitionUgx !== undefined) data.tuitionUgx = parsed.data.tuitionUgx;
  if (parsed.data.functionalFeesUgx !== undefined) data.functionalFeesUgx = parsed.data.functionalFeesUgx;
  if (parsed.data.year !== undefined) data.year = parsed.data.year;
  if (parsed.data.semester !== undefined) data.semester = parsed.data.semester;
  if (parsed.data.recurrence !== undefined) data.recurrence = parsed.data.recurrence;
  if (parsed.data.feeKey !== undefined) data.feeKey = nextFeeKey;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  try {
    const updated = await prisma.programmeFee.update({
      where: { id: feeId },
      data,
    });
    revalidateProgrammesCache(fee.programme.organizationId);
    return NextResponse.json({
      fee: {
        id: updated.id,
        year: updated.year,
        semester: updated.semester,
        recurrence: updated.recurrence,
        feeKey: updated.feeKey,
        tuitionUgx: updated.tuitionUgx,
        functionalFeesUgx: updated.functionalFeesUgx,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("duplicate")) {
      return NextResponse.json(
        { error: "Another row already uses this recurrence, year, semester, and fee key" },
        { status: 409 }
      );
    }
    console.error("[admin/programmes fees PATCH]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; feeId: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: programmeId, feeId } = await ctx.params;
  if (!isValidObjectId(programmeId) || !isValidObjectId(feeId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const feeRow = await prisma.programmeFee.findFirst({
    where: { id: feeId, programmeId },
    include: { programme: { select: { organizationId: true, code: true } } },
  });
  if (!feeRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gate = await assertFeeAccess(admin, feeRow.programme.organizationId);
  if (gate) return gate;

  await prisma.programmeFee.delete({ where: { id: feeId } });
  revalidateProgrammesCache(feeRow.programme.organizationId);
  return NextResponse.json({ ok: true });
}
