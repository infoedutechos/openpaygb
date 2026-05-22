import { ProgrammeTrack } from "@/lib/programme-track";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveOrganizationIdForProgrammeAdmin } from "@/lib/admin-programmes-scope";
import { programmeCodeSchema } from "@/lib/programme-code-zod";
import { revalidateProgrammesCache } from "@/lib/cached-programmes";
import { normalizeProgrammeTrack } from "@/lib/programme-track";
import { getProgrammeDurationSummary, getProgrammePeriodDetails } from "@/lib/tuition-progress";

const CreateBody = z.object({
  organizationSlug: z.string().min(1).optional(),
  code: programmeCodeSchema,
  name: z.string().min(2).max(200),
  track: z.nativeEnum(ProgrammeTrack).optional(),
  durationYears: z.number().int().min(0).max(6).optional(),
  semestersPerYear: z.number().int().min(0).max(3).optional(),
});

export async function GET(req: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const organizationSlug = url.searchParams.get("organizationSlug")?.trim() ?? undefined;

  const resolved = await resolveOrganizationIdForProgrammeAdmin(admin, organizationSlug ?? null);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const rows = await prisma.programme.findMany({
    where: { organizationId: resolved.organizationId },
    orderBy: { code: "asc" },
    include: { fees: { orderBy: [{ year: "asc" }, { semester: "asc" }] } },
  });

  return NextResponse.json({
    programmes: rows.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      track: normalizeProgrammeTrack(p.track),
      durationYears: p.durationYears ?? 0,
      semestersPerYear: p.semestersPerYear ?? 0,
      duration: getProgrammeDurationSummary(p),
      periods: getProgrammePeriodDetails(p),
      fees: p.fees.map((f) => ({
        id: f.id,
        year: f.year,
        semester: f.semester,
        recurrence: f.recurrence,
        feeKey: f.feeKey,
        tuitionUgx: f.tuitionUgx,
        functionalFeesUgx: f.functionalFeesUgx,
      })),
    })),
  });
}

export async function POST(req: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const slug = admin.role === "master" ? parsed.data.organizationSlug?.trim() : undefined;
  if (admin.role === "master" && !slug) {
    return NextResponse.json({ error: "organizationSlug is required in body for platform masters" }, { status: 400 });
  }
  const resolved = await resolveOrganizationIdForProgrammeAdmin(admin, slug ?? null);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const code = parsed.data.code.trim().toUpperCase();
  try {
    const created = await prisma.programme.create({
      data: {
        organizationId: resolved.organizationId,
        code,
        name: parsed.data.name.trim(),
        track: parsed.data.track ?? ProgrammeTrack.regular,
        durationYears: parsed.data.durationYears ?? 0,
        semestersPerYear: parsed.data.semestersPerYear ?? 0,
      },
      include: { fees: true },
    });
    revalidateProgrammesCache(resolved.organizationId);
    return NextResponse.json(
      {
        programme: {
          id: created.id,
          code: created.code,
          name: created.name,
          track: normalizeProgrammeTrack(created.track),
          durationYears: created.durationYears ?? 0,
          semestersPerYear: created.semestersPerYear ?? 0,
          duration: getProgrammeDurationSummary(created),
          periods: getProgrammePeriodDetails(created),
          fees: created.fees,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "A programme with this code already exists for this school" }, { status: 409 });
    }
    console.error("[admin/programmes POST]", e);
    return NextResponse.json({ error: "Could not create programme" }, { status: 500 });
  }
}
