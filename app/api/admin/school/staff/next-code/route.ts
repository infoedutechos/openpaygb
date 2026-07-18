import { NextResponse } from "next/server";
import { allocateStaffCode, orgToStaffFormatConfig, previewStaffFormat } from "@/lib/staff-code";
import { apiErrorResponse } from "@/lib/api-error";
import { requireStaffHrAdminScope } from "@/lib/staff-admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireStaffHrAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const org = await prisma.organization.findUnique({
      where: { id: auth.scope.organizationId },
      select: {
        slug: true,
        staffFormatConfigured: true,
        staffPrefix: true,
        staffIncludeYear: true,
        staffYearSource: true,
        staffSeqDigits: true,
        staffSeparator: true,
        staffSeqStart: true,
        currentAcademicYearLabel: true,
      },
    });
    const cfg = orgToStaffFormatConfig(org ?? { slug: auth.scope.slug });
    const staffCode = await allocateStaffCode(auth.scope.organizationId);
    const preview = previewStaffFormat(cfg);

    return NextResponse.json({
      staffCode,
      staffFormatConfigured: cfg.configured,
      staffPreview: preview.example,
      configurePath: "/admin/settings#staff-id",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/staff/next-code" });
  }
}
