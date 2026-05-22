import { ProgrammeFeeRecurrence } from "@prisma/client";
import { revalidateProgrammesCache } from "@/lib/cached-programmes";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";
import { feeSlotError, normalizeProgrammeFeeKey } from "@/lib/programme-fee-slot";

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
  return null;
}

const FeeBody = z
  .object({
    year: z.number().int().min(1).max(6),
    semester: z.number().int().min(0).max(3),
    tuitionUgx: z.number().int().min(0).max(50_000_000),
    functionalFeesUgx: z.number().int().min(0).max(50_000_000),
    recurrence: z.nativeEnum(ProgrammeFeeRecurrence).optional(),
    feeKey: z.string().max(64).optional(),
  })
  .transform((d) => ({
    ...d,
    recurrence: d.recurrence ?? ProgrammeFeeRecurrence.per_semester,
    feeKey: normalizeProgrammeFeeKey(d.feeKey),
  }))
  .superRefine((d, ctx) => {
    const err = feeSlotError(d.recurrence, d.semester);
    if (err) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: err, path: ["semester"] });
    }
    if (d.feeKey !== "default" && !/^[a-zA-Z0-9_-]+$/.test(d.feeKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "feeKey: use letters, numbers, hyphen or underscore",
        path: ["feeKey"],
      });
    }
  });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: programmeId } = await ctx.params;
  if (!isValidObjectId(programmeId)) {
    return NextResponse.json({ error: "Invalid programme id" }, { status: 400 });
  }

  const prog = await prisma.programme.findUnique({
    where: { id: programmeId },
    select: { id: true, organizationId: true },
  });
  if (!prog) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }

  const gate = await assertProgrammeAccess(admin, prog.organizationId);
  if (gate) return gate;

  const json = await req.json().catch(() => null);
  const parsed = FeeBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const fee = await prisma.programmeFee.create({
      data: {
        programmeId,
        year: parsed.data.year,
        semester: parsed.data.semester,
        recurrence: parsed.data.recurrence,
        feeKey: parsed.data.feeKey,
        tuitionUgx: parsed.data.tuitionUgx,
        functionalFeesUgx: parsed.data.functionalFeesUgx,
      },
    });
    revalidateProgrammesCache(prog.organizationId);
    return NextResponse.json(
      {
        fee: {
          id: fee.id,
          year: fee.year,
          semester: fee.semester,
          recurrence: fee.recurrence,
          feeKey: fee.feeKey,
          tuitionUgx: fee.tuitionUgx,
          functionalFeesUgx: fee.functionalFeesUgx,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("duplicate")) {
      return NextResponse.json(
        { error: "A fee row already exists for this recurrence, year, semester, and fee key" },
        { status: 409 }
      );
    }
    console.error("[admin/programmes fees POST]", e);
    return NextResponse.json({ error: "Could not add fee row" }, { status: 500 });
  }
}
