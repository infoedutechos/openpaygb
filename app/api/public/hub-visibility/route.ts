import { NextResponse } from "next/server";
import { getHubVisibilityState } from "@/lib/hub-visibility";

export const dynamic = "force-dynamic";

/** Public hub hide flags — `true` means that hub is hidden. */
export async function GET() {
  const state = await getHubVisibilityState();
  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
