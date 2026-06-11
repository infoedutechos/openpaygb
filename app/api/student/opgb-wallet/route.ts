import { NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { ensureOpgbWallet, getOpgbWalletSummary } from "@/lib/opgb-ledger";
import { getOpgbAssetBalances } from "@/lib/opgb-asset-balance";
import { buildOpgbWalletDisplay } from "@/lib/opgb-wallet-display";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: { organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const walletRow = await ensureOpgbWallet(session.sub, student.organizationId);
    const wallet = await getOpgbWalletSummary(session.sub);
    const assetMap = await getOpgbAssetBalances(walletRow.id);
    const display = await buildOpgbWalletDisplay(wallet?.balanceMinor ?? 0, assetMap);

    return NextResponse.json({
      peg: display.peg,
      phase: display.phase,
      portfolioValueUgx: display.portfolioValueUgx,
      fx: display.fx,
      balanceMinor: wallet?.balanceMinor ?? 0,
      balanceUgx: wallet?.balanceMinor ?? 0,
      balances: display.balances,
      entries: wallet?.entries ?? [],
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/student/opgb-wallet" });
  }
}
