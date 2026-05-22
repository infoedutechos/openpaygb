import { NextResponse } from "next/server";
import { z } from "zod";
import { OrganizationTenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { cloneProgrammesAndFxFromTemplate } from "@/lib/org-provision";
import { revalidateOrganizationCaches } from "@/lib/revalidate-organizations";

const PatchBody = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.slug === "default") {
    return NextResponse.json({ error: "Cannot change the template organization this way" }, { status: 400 });
  }

  if (parsed.data.action === "reject") {
    if (org.tenantStatus !== OrganizationTenantStatus.pending) {
      return NextResponse.json(
        { error: "Only pending tenants can be rejected" },
        { status: 400 }
      );
    }
    const updated = await prisma.organization.update({
      where: { id },
      data: { tenantStatus: OrganizationTenantStatus.rejected },
    });
    revalidateOrganizationCaches(org.slug);
    return NextResponse.json({ organization: updated });
  }

  // approve
  if (org.tenantStatus !== OrganizationTenantStatus.pending) {
    if (org.tenantStatus === OrganizationTenantStatus.active) {
      return NextResponse.json({ organization: org });
    }
    return NextResponse.json(
      { error: "Only pending tenants can be approved" },
      { status: 400 }
    );
  }

  try {
    await cloneProgrammesAndFxFromTemplate(id);
    const updated = await prisma.organization.update({
      where: { id },
      data: { tenantStatus: OrganizationTenantStatus.active },
    });
    revalidateOrganizationCaches(updated.slug, updated.id);
    return NextResponse.json({ organization: updated });
  } catch (e) {
    console.error("[master/organizations PATCH approve]", e);
    const message = e instanceof Error ? e.message : "Provision failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
