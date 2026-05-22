import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/master-session";
import { getTuitionBackupCounts } from "@/lib/backup/tuition-snapshot";

/** Row counts for live backup preview (no download). */
export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  try {
    const counts = await getTuitionBackupCounts();
    const total = Object.values(counts).reduce((a, n) => a + n, 0);
    return NextResponse.json({
      counts,
      totalRecords: total,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[master/backup/status GET]", e);
    return NextResponse.json({ error: "Could not read backup status" }, { status: 500 });
  }
}
