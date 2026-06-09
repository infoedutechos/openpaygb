import { NextResponse } from "next/server";
import { buildTmaMe } from "@/lib/tma-session";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    const initData = new URL(req.url).searchParams.get("initData") ?? undefined;
    const me = await buildTmaMe(initData);
    return NextResponse.json(me);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/tma/me", fallback: "Could not load TMA profile" });
  }
}
