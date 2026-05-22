import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import { isProductionRuntime } from "@/lib/production-secrets";
import { parseBackupJson, restoreTuitionBackup, type RestoreMode } from "@/lib/backup/tuition-restore";

export const maxDuration = 120;

const BodySchema = z.object({
  mode: z.enum(["dryRun", "replaceTuition", "mergeUpsert"]),
  confirm: z.string().optional(),
  snapshot: z.unknown(),
});

function restorePermitted(): { ok: true } | { ok: false; response: NextResponse } {
  if (!isProductionRuntime()) return { ok: true };
  if (process.env.ALLOW_TUITION_RESTORE === "true") return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      {
        error:
          "Tuition restore is disabled in production. Set ALLOW_TUITION_RESTORE=true to enable, or use MongoDB Atlas point-in-time recovery.",
      },
      { status: 403 },
    ),
  };
}

function requireConfirm(mode: RestoreMode, confirm: string | undefined): NextResponse | null {
  if (mode === "dryRun") return null;
  if (confirm === "RESTORE") return null;
  return NextResponse.json(
    { error: 'Destructive restore requires confirm="RESTORE"' },
    { status: 400 },
  );
}

async function readSnapshotFromRequest(
  req: Request,
): Promise<{ ok: true; snapshot: unknown; mode: RestoreMode; confirm?: string } | { ok: false; response: NextResponse }> {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return { ok: false, response: NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }) };
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { ok: false, response: NextResponse.json({ error: 'Expected form field "file"' }, { status: 400 }) };
    }
    const modeRaw = String(form.get("mode") ?? "dryRun");
    const mode = (["dryRun", "replaceTuition", "mergeUpsert"].includes(modeRaw)
      ? modeRaw
      : "dryRun") as RestoreMode;
    const confirm = String(form.get("confirm") ?? "") || undefined;
    const text = await file.text();
    try {
      const snapshot = parseBackupJson(text);
      return { ok: true, snapshot, mode, confirm };
    } catch {
      return { ok: false, response: NextResponse.json({ error: "Backup file is not valid JSON" }, { status: 400 }) };
    }
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 }),
    };
  }

  return {
    ok: true,
    snapshot: parsed.data.snapshot,
    mode: parsed.data.mode,
    confirm: parsed.data.confirm,
  };
}

/** Restore tuition data from a backup JSON snapshot (master only). */
export async function POST(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const loaded = await readSnapshotFromRequest(req);
  if (!loaded.ok) return loaded.response;

  const confirmErr = requireConfirm(loaded.mode, loaded.confirm);
  if (confirmErr) return confirmErr;

  if (loaded.mode !== "dryRun") {
    const permitted = restorePermitted();
    if (!permitted.ok) return permitted.response;
  }

  try {
    const report = await restoreTuitionBackup({ raw: loaded.snapshot, mode: loaded.mode });
    return NextResponse.json({ report });
  } catch (e) {
    console.error("[master/backup/restore POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Restore failed" },
      { status: 500 },
    );
  }
}
