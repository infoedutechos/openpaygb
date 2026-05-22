import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { isValidObjectId } from "@/lib/object-id";
import { revalidateProgrammesCache } from "@/lib/cached-programmes";
import { normalizeProgrammeTrack } from "@/lib/programme-track";
import { getProgrammeDurationSummary, getProgrammePeriodDetails } from "@/lib/tuition-progress";

const PatchBody = z
  .object({
    durationYears: z.number().int().min(0).max(6).optional(),
    semestersPerYear: z.number().int().min(0).max(3).optional(),
  })
  .refine(
    (data) => data.durationYears !== undefined || data.semestersPerYear !== undefined,
    { message: "Provide durationYears and/or semestersPerYear." },
  );

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.programme.findUnique({
    where: { id },
    select: { id: true, organizationId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }

  const data: { durationYears?: number; semestersPerYear?: number } = {};
  if (parsed.data.durationYears !== undefined) data.durationYears = parsed.data.durationYears;
  if (parsed.data.semestersPerYear !== undefined) data.semestersPerYear = parsed.data.semestersPerYear;

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
      effectiveDuration: getProgrammeDurationSummary(updated),
      periods: getProgrammePeriodDetails(updated),
    },
  });
}
