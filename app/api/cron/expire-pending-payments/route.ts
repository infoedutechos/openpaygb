import { NextResponse } from "next/server";
import { expireStalePendingPayments } from "@/lib/expire-pending-payments";
import { requireCronAuth } from "@/lib/production-secrets";

export async function GET(req: Request) {
  const cronAuth = requireCronAuth(req);
  if (!cronAuth.ok) return cronAuth.response;

  const { expired } = await expireStalePendingPayments();
  return NextResponse.json({ ok: true, expired });
}
