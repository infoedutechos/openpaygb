import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireStaffHrAdminScope } from "@/lib/staff-admin-api";
import {
  DEFAULT_STAFF_DUTIES,
  parseStaffDuties,
  serializeStaffDuties,
} from "@/lib/staff-duties";

const PutBody = z.object({
  organizationSlug: z.string().optional(),
  duties: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        category: z.enum(["teaching", "non_teaching"]),
      }),
    )
    .max(80),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireStaffHrAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const org = await prisma.organization.findUnique({
      where: { id: auth.scope.organizationId },
      select: { staffDuties: true },
    });
    const stored = Array.isArray(org?.staffDuties) ? org!.staffDuties : [];
    const configured = Array.isArray(stored) && stored.length > 0;
    const duties = parseStaffDuties(org?.staffDuties, { fallbackDefaults: true });

    return NextResponse.json({
      duties,
      configured,
      defaults: DEFAULT_STAFF_DUTIES,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/staff/duties" });
  }
}

export async function PUT(req: Request) {
  try {
    const body = PutBody.parse(await req.json());
    const auth = await requireStaffHrAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const duties = serializeStaffDuties(body.duties);
    if (!duties.length) {
      return NextResponse.json({ error: "Add at least one duty" }, { status: 400 });
    }

    await prisma.organization.update({
      where: { id: auth.scope.organizationId },
      data: { staffDuties: duties },
    });

    return NextResponse.json({ duties, configured: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PUT /api/admin/school/staff/duties" });
  }
}
