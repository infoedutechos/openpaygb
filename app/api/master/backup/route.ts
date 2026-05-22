import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/master-session";
import { buildTuitionBackupSnapshot } from "@/lib/backup/tuition-snapshot";

export const maxDuration = 120;

/** Download a live point-in-time JSON backup of tuition data. */
export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  try {
    const snapshot = await buildTuitionBackupSnapshot();
    const body = JSON.stringify(snapshot, null, 2);
    const stamp = snapshot.meta.exportedAt.replace(/[:.]/g, "-");
    const filename = `odelhub-tuition-backup-${stamp}.json`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Backup-Exported-At": snapshot.meta.exportedAt,
      },
    });
  } catch (e) {
    console.error("[master/backup GET]", e);
    return NextResponse.json({ error: "Backup export failed" }, { status: 500 });
  }
}
