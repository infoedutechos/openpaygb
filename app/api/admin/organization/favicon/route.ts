import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveOrgAdminOrganization } from "@/lib/admin-school-org";
import { resolveOrgFaviconBodyBuffer, validateOrgFaviconForSave } from "@/lib/org-favicon-body";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

/** School / org admin: upload tenant favicon for /pay/{slug} branding. */
export async function POST(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await resolveOrgAdminOrganization(admin);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const body = await resolveOrgFaviconBodyBuffer(req);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const validated = validateOrgFaviconForSave(body.buf);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id: scope.organizationId },
      data: {
        faviconIco: Buffer.from(validated.bytes),
        faviconUploadedAt: new Date(),
      },
      select: { slug: true, faviconUploadedAt: true },
    });

    return NextResponse.json({
      slug: updated.slug,
      faviconUploadedAt: updated.faviconUploadedAt?.toISOString() ?? null,
      publicUrl: `/api/org/${encodeURIComponent(updated.slug)}/favicon`,
      contentType: validated.contentType,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/organization/favicon" });
  }
}

export async function DELETE() {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await resolveOrgAdminOrganization(admin);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    await prisma.organization.update({
      where: { id: scope.organizationId },
      data: { faviconIco: null, faviconUploadedAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/organization/favicon" });
  }
}
