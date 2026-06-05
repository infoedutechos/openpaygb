import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { getSchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";

const PatchBody = z.object({
  requireMasterApproval: z.boolean(),
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

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: {
      key: PLATFORM_SITE_UI_KEY,
      schoolWorkspaceRequireMasterApproval: parsed.data.requireMasterApproval,
    },
    update: {
      schoolWorkspaceRequireMasterApproval: parsed.data.requireMasterApproval,
    },
  });

  const policy = await getSchoolWorkspaceRegistrationPolicy();
  return NextResponse.json(policy);
}
