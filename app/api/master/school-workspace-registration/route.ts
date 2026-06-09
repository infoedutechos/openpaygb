import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { getSchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";

const PatchBody = z.object({
  requireMasterApproval: z.boolean().optional(),
  autoGenerateAdminLogin: z.boolean().optional(),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const policy = await getSchoolWorkspaceRegistrationPolicy();
  return NextResponse.json(policy);
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  if (
    parsed.data.requireMasterApproval === undefined &&
    parsed.data.autoGenerateAdminLogin === undefined
  ) {
    return NextResponse.json({ error: "No settings to update" }, { status: 400 });
  }

  const current = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: {
      schoolWorkspaceRequireMasterApproval: true,
      schoolWorkspaceAutoGenerateAdminLogin: true,
    },
  });

  const requireMasterApproval =
    parsed.data.requireMasterApproval ?? current?.schoolWorkspaceRequireMasterApproval ?? true;
  const autoGenerateAdminLogin =
    parsed.data.autoGenerateAdminLogin ?? current?.schoolWorkspaceAutoGenerateAdminLogin ?? false;

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: {
      key: PLATFORM_SITE_UI_KEY,
      schoolWorkspaceRequireMasterApproval: requireMasterApproval,
      schoolWorkspaceAutoGenerateAdminLogin: autoGenerateAdminLogin,
    },
    update: {
      schoolWorkspaceRequireMasterApproval: requireMasterApproval,
      schoolWorkspaceAutoGenerateAdminLogin: autoGenerateAdminLogin,
    },
  });

  const policy = await getSchoolWorkspaceRegistrationPolicy();
  return NextResponse.json(policy);
}
