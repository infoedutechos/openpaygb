import { ProgrammeTrack } from "@/lib/programme-track";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";
import { programmeCodeSchema } from "@/lib/programme-code-zod";
import { revalidateProgrammesCache } from "@/lib/cached-programmes";
import { normalizeProgrammeTrack } from "@/lib/programme-track";
import { getProgrammeDurationSummary, getProgrammePeriodDetails } from "@/lib/tuition-progress";

const PatchBody = z.object({
  name: z.string().min(2).max(200).optional(),
  code: programmeCodeSchema.optional(),
  track: z.nativeEnum(ProgrammeTrack).optional(),
  durationYears: z.number().int().min(0).max(6).optional(),
  semestersPerYear: z.number().int().min(0).max(3).optional(),
});

async function assertProgrammeAccess(
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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  if (
    !parsed.data.name &&
    !parsed.data.code &&
    parsed.data.track === undefined &&
    parsed.data.durationYears === undefined &&
    parsed.data.semestersPerYear === undefined
  ) {
    return NextResponse.json({ error: "Provide name, code, track, and/or duration fields" }, { status: 400 });
  }

  const existing = await prisma.programme.findUnique({
    where: { id },
    select: { id: true, organizationId: true, code: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gate = await assertProgrammeAccess(admin, existing.organizationId);
  if (gate) return gate;

  const data: { name?: string; code?: string; track?: ProgrammeTrack; durationYears?: number; semestersPerYear?: number } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.code !== undefined) data.code = parsed.data.code.trim().toUpperCase();
  if (parsed.data.track !== undefined) data.track = parsed.data.track;
  if (parsed.data.durationYears !== undefined) data.durationYears = parsed.data.durationYears;
  if (parsed.data.semestersPerYear !== undefined) data.semestersPerYear = parsed.data.semestersPerYear;

  try {
    const updated = await prisma.programme.update({
      where: { id },
      data,
      include: { fees: { orderBy: [{ year: "asc" }, { semester: "asc" }] } },
    });
    revalidateProgrammesCache(existing.organizationId);
    return NextResponse.json({
      programme: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        track: normalizeProgrammeTrack(updated.track),
        durationYears: updated.durationYears ?? 0,
        semestersPerYear: updated.semestersPerYear ?? 0,
        duration: getProgrammeDurationSummary(updated),
        periods: getProgrammePeriodDetails(updated),
        fees: updated.fees.map((f) => ({
          id: f.id,
          year: f.year,
          semester: f.semester,
          recurrence: f.recurrence,
          feeKey: f.feeKey,
          tuitionUgx: f.tuitionUgx,
          functionalFeesUgx: f.functionalFeesUgx,
        })),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Code already in use for this school" }, { status: 409 });
    }
    console.error("[admin/programmes PATCH]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.programme.findUnique({
    where: { id },
    select: { id: true, organizationId: true, code: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gate = await assertProgrammeAccess(admin, existing.organizationId);
  if (gate) return gate;

  const payCount = await prisma.payment.count({
    where: { organizationId: existing.organizationId, programmeCode: existing.code },
  });
  if (payCount > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete programme with existing payments",
        hint: "Archive by renaming the code or contact support to migrate payment history.",
      },
      { status: 409 }
    );
  }

  await prisma.programme.delete({ where: { id } });
  revalidateProgrammesCache(existing.organizationId);
  return NextResponse.json({ ok: true });
}
