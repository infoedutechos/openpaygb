import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { revalidateProgrammesCache } from "@/lib/cached-programmes";
import { getProgrammeDurationSummary } from "@/lib/tuition-progress";

const Body = z.object({
  organizationSlug: z.string().min(1).optional(),
  /** When true, overwrite even programmes that already have durations set. */
  overwriteExisting: z.boolean().optional().default(false),
  /** Optional explicit list of programme IDs to apply to (e.g. one tenant from the UI). */
  programmeIds: z.array(z.string().min(1)).optional(),
});

export async function POST(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  let organizationId: string | undefined;
  if (parsed.data.organizationSlug) {
    const org = await prisma.organization.findFirst({
      where: { slug: parsed.data.organizationSlug.trim().toLowerCase() },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Unknown organization slug" }, { status: 400 });
    }
    organizationId = org.id;
  }

  const whereClause: { organizationId?: string; id?: { in: string[] } } = {};
  if (organizationId) whereClause.organizationId = organizationId;
  if (parsed.data.programmeIds?.length) whereClause.id = { in: parsed.data.programmeIds };

  const programmes = await prisma.programme.findMany({
    where: whereClause,
    include: { fees: true },
  });

  let updated = 0;
  let skippedNoFees = 0;
  let skippedAlreadySet = 0;
  const affectedOrgIds = new Set<string>();

  for (const programme of programmes) {
    const inferred = getProgrammeDurationSummary({
      ...programme,
      durationYears: null,
      semestersPerYear: null,
    });
    if (inferred.totalSemesters === 0) {
      skippedNoFees++;
      continue;
    }

    const currentYears = programme.durationYears ?? 0;
    const currentSems = programme.semestersPerYear ?? 0;
    const overwrite = parsed.data.overwriteExisting;

    const nextYears = overwrite || currentYears === 0 ? inferred.durationYears : currentYears;
    const nextSems = overwrite || currentSems === 0 ? inferred.semestersPerYear : currentSems;

    if (nextYears === currentYears && nextSems === currentSems) {
      skippedAlreadySet++;
      continue;
    }

    await prisma.programme.update({
      where: { id: programme.id },
      data: { durationYears: nextYears, semestersPerYear: nextSems },
    });
    affectedOrgIds.add(programme.organizationId);
    updated++;
  }

  for (const id of affectedOrgIds) {
    revalidateProgrammesCache(id);
  }

  return NextResponse.json({
    ok: true,
    scanned: programmes.length,
    updated,
    skippedNoFees,
    skippedAlreadySet,
  });
}
