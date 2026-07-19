import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { getHubVisibilityState } from "@/lib/hub-visibility";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";

const PatchBody = z.object({
  tuition: z.boolean().optional(),
  play: z.boolean().optional(),
  dex: z.boolean().optional(),
  developers: z.boolean().optional(),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const state = await getHubVisibilityState();
  return NextResponse.json(state);
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const current = await getHubVisibilityState();
  const next = {
    tuition: parsed.data.tuition ?? current.tuition,
    play: parsed.data.play ?? current.play,
    dex: parsed.data.dex ?? current.dex,
    developers: parsed.data.developers ?? current.developers,
  };

  const update = {
    tuitionHubHidden: next.tuition,
    playHubHidden: next.play,
    dexHubHidden: next.dex,
    developersHubHidden: next.developers,
  };

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: {
      key: PLATFORM_SITE_UI_KEY,
      ...update,
    },
    update,
  });

  const state = await getHubVisibilityState();
  return NextResponse.json(state);
}
