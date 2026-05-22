import { ProgrammeTrack } from "@/lib/programme-track";
import { revalidateProgrammesCache } from "@/lib/cached-programmes";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveOrganizationIdForProgrammeAdmin } from "@/lib/admin-programmes-scope";
import { parseProgrammesListCsv } from "@/lib/programmes-list-import";
import { programmeCodeSchema } from "@/lib/programme-code-zod";

const RowSchema = z.object({
  code: programmeCodeSchema,
  name: z.string().min(2).max(200),
});

const Body = z.object({
  organizationSlug: z.string().min(1).optional(),
  csv: z.string().min(1).max(512_000),
  /** Every imported row is assigned this track (In-service vs Regular). */
  track: z.nativeEnum(ProgrammeTrack).optional(),
});

const MAX_ROWS = 250;

export async function POST(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const slug =
      admin.role === "master" ? parsed.data.organizationSlug?.trim().toLowerCase() : undefined;
    if (admin.role === "master" && !slug) {
      return NextResponse.json({ error: "organizationSlug is required for platform masters" }, { status: 400 });
    }

    const resolved = await resolveOrganizationIdForProgrammeAdmin(admin, slug ?? null);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const importTrack = parsed.data.track ?? ProgrammeTrack.regular;

    const parsedLines = parseProgrammesListCsv(parsed.data.csv);
    if (parsedLines.length === 0) {
      return NextResponse.json(
        { error: "No data rows found. Use code,name header and one programme per line." },
        { status: 400 }
      );
    }
    if (parsedLines.length > MAX_ROWS) {
      return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
    }

    const seen = new Set<string>();
    const validated: { code: string; name: string; line: number }[] = [];
    const parseErrors: { line: number; reason: string }[] = [];

    for (const row of parsedLines) {
      const code = row.code.trim().toUpperCase();
      const name = row.name.trim();
      if (seen.has(code)) {
        parseErrors.push({ line: row.line, reason: `Duplicate code ${code} in file (skipped)` });
        continue;
      }
      const rowCheck = RowSchema.safeParse({ code, name });
      if (!rowCheck.success) {
        parseErrors.push({
          line: row.line,
          reason: rowCheck.error.errors.map((e) => e.message).join("; ") || "Invalid row",
        });
        continue;
      }
      seen.add(code);
      validated.push({ code, name, line: row.line });
    }

    const created: string[] = [];
    const failed: { code: string; line: number; reason: string }[] = [];

    for (const row of validated) {
      try {
        await prisma.programme.create({
          data: {
            organizationId: resolved.organizationId,
            code: row.code,
            name: row.name,
            track: importTrack,
          },
        });
        created.push(row.code);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Unique") || msg.includes("duplicate")) {
          failed.push({ code: row.code, line: row.line, reason: "Programme code already exists for this school" });
        } else {
          failed.push({ code: row.code, line: row.line, reason: "Could not create" });
        }
      }
    }

    revalidateProgrammesCache(resolved.organizationId);
    return NextResponse.json({
      ok: true,
      createdCount: created.length,
      created,
      failed,
      parseErrors,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/programmes/import]", e);
    const safe =
      msg.includes("Missing organization") || msg.includes("DATABASE_URL") || msg.includes("Prisma")
        ? msg
        : "Import failed unexpectedly. Check server logs and database connectivity.";
    return NextResponse.json(
      { error: safe, ...(process.env.NODE_ENV === "development" ? { detail: msg } : {}) },
      { status: 500 }
    );
  }
}
