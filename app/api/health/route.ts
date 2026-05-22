import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProductionRuntime } from "@/lib/production-secrets";

export async function GET(req: Request) {
  const healthSecret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (isProductionRuntime() && healthSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${healthSecret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  try {
    await prisma.$connect();
    return NextResponse.json({ ok: true, db: "connected" });
  } catch {
    return NextResponse.json(
      { ok: false, db: isProductionRuntime() ? "unavailable" : "error" },
      { status: 503 },
    );
  }
}
