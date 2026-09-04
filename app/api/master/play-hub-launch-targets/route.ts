import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import {
  activatePlayHubLaunchTargetPersisted,
  deletePlayHubLaunchTargetPersisted,
  getPlayHubLaunchTargets,
  upsertPlayHubLaunchTargetPersisted,
} from "@/lib/play-hub-launch-store";
import { publicPlayHubLaunchPayload } from "@/lib/play-hub-launch-targets";

export const dynamic = "force-dynamic";

const UpsertBody = z.object({
  id: z.string().min(1).optional(),
  label: z.string().min(1).max(120),
  url: z.string().min(1).max(2000),
  kind: z.enum(["internal", "telegram_webapp", "external", "iframe"]).optional(),
  enabled: z.boolean().optional(),
  openMode: z.enum(["same_tab", "new_tab", "telegram", "iframe"]).optional(),
  notes: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
  activate: z.boolean().optional(),
});

const ActionBody = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("upsert"),
    target: UpsertBody,
  }),
  z.object({
    action: z.literal("activate"),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal("setEnabled"),
    id: z.string().min(1),
    enabled: z.boolean(),
  }),
]);

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const targets = await getPlayHubLaunchTargets();
  return NextResponse.json({
    targets,
    public: publicPlayHubLaunchPayload(targets),
  });
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = ActionBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const body = parsed.data;
    let targets = await getPlayHubLaunchTargets();

    switch (body.action) {
      case "upsert":
        targets = await upsertPlayHubLaunchTargetPersisted(body.target);
        break;
      case "activate":
        targets = await activatePlayHubLaunchTargetPersisted(body.id);
        break;
      case "delete":
        targets = await deletePlayHubLaunchTargetPersisted(body.id);
        break;
      case "setEnabled": {
        const row = targets.find((t) => t.id === body.id);
        if (!row) {
          return NextResponse.json({ error: "Unknown launch target" }, { status: 404 });
        }
        const enabling = body.enabled;
        targets = await upsertPlayHubLaunchTargetPersisted({
          id: row.id,
          label: row.label,
          url: row.url,
          kind: row.kind,
          enabled: enabling,
          openMode: row.openMode,
          notes: row.notes,
          sortOrder: row.sortOrder,
        });
        if (!enabling && row.isActive) {
          const remaining = targets.find((t) => t.enabled && t.id !== row.id);
          if (remaining) {
            targets = await activatePlayHubLaunchTargetPersisted(remaining.id);
          }
        }
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({
      targets,
      public: publicPlayHubLaunchPayload(targets),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
