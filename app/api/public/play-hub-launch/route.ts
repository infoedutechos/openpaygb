import { NextResponse } from "next/server";
import { getPlayHubLaunchTargets } from "@/lib/play-hub-launch-store";
import { publicPlayHubLaunchPayload } from "@/lib/play-hub-launch-targets";

export const dynamic = "force-dynamic";

/** Public Play Hub launch targets — active primary + enabled switcher list. */
export async function GET() {
  const targets = await getPlayHubLaunchTargets();
  return NextResponse.json(publicPlayHubLaunchPayload(targets), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
