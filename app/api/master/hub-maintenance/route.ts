import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { getHubMaintenanceState } from "@/lib/hub-maintenance";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { getPlatformBranding } from "@/lib/platform-customisation";

const PatchBody = z.object({
  tuition: z.boolean().optional(),
  play: z.boolean().optional(),
  dex: z.boolean().optional(),
  developers: z.boolean().optional(),
  message: z.string().max(500).optional(),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const [state, branding] = await Promise.all([getHubMaintenanceState(), getPlatformBranding()]);
  return NextResponse.json({
    ...state,
    message: branding.hubMaintenanceMessage,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const current = await getHubMaintenanceState();
  const next = {
    tuition: parsed.data.tuition ?? current.tuition,
    play: parsed.data.play ?? current.play,
    dex: parsed.data.dex ?? current.dex,
    developers: parsed.data.developers ?? current.developers,
  };

  const update: Record<string, unknown> = {
    tuitionHubMaintenance: next.tuition,
    playHubMaintenance: next.play,
    dexHubMaintenance: next.dex,
    developersHubMaintenance: next.developers,
  };
  if (parsed.data.message !== undefined) {
    update.hubMaintenanceMessage = parsed.data.message.trim();
  }

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: {
      key: PLATFORM_SITE_UI_KEY,
      ...update,
    },
    update,
  });

  const [state, branding] = await Promise.all([getHubMaintenanceState(), getPlatformBranding()]);
  return NextResponse.json({
    ...state,
    message: branding.hubMaintenanceMessage,
  });
}
