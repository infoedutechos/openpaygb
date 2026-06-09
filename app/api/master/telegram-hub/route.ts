import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import { getTelegramHubSettings, persistTelegramHubChannel } from "@/lib/telegram-hub-settings";

const PatchBody = z.object({
  officialChannelName: z.string().min(1).max(120),
  officialChannelUrl: z.string().min(1).max(2048),
  officialChannelId: z.string().min(1).max(32),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const settings = await getTelegramHubSettings(gate.user);
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  await persistTelegramHubChannel(parsed.data);
  const settings = await getTelegramHubSettings(gate.user);
  return NextResponse.json(settings);
}
