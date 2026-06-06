import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import {
  COPILOT_BUBBLE_PATH,
  copilotBubbleImageUrl,
} from "@/lib/copilot-bubble-image";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-settings";
import {
  platformLogoContentType,
  validatePlatformLogoBuffer,
} from "@/lib/validate-platform-logo";

async function resolveBodyBuffer(req: Request): Promise<{ ok: true; buf: Buffer } | { ok: false; error: string }> {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return { ok: false, error: "Invalid multipart body" };
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: 'Expected multipart field "file" with the image.' };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    return { ok: true, buf };
  }

  if (ct.includes("application/octet-stream")) {
    const ab = await req.arrayBuffer().catch(() => null);
    if (!ab) return { ok: false, error: "Empty body" };
    return { ok: true, buf: Buffer.from(ab) };
  }

  return {
    ok: false,
    error: 'Use multipart form field "file", or Content-Type application/octet-stream.',
  };
}

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: { copilotBubbleImageUploadedAt: true },
  });

  const uploadedAt = row?.copilotBubbleImageUploadedAt ?? null;
  return NextResponse.json({
    hasCopilotBubbleImage: Boolean(uploadedAt),
    copilotBubbleImageUploadedAt: uploadedAt?.toISOString() ?? null,
    publicUrl: copilotBubbleImageUrl(uploadedAt),
    path: COPILOT_BUBBLE_PATH,
  });
}

export async function POST(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const body = await resolveBodyBuffer(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const validated = validatePlatformLogoBuffer(body.buf);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 400 });
  }

  try {
    const uploadedAt = new Date();
    const bytes = new Uint8Array(body.buf);
    await prisma.siteUiSettings.upsert({
      where: { key: PLATFORM_SITE_UI_KEY },
      create: {
        key: PLATFORM_SITE_UI_KEY,
        copilotBubbleImage: bytes,
        copilotBubbleImageUploadedAt: uploadedAt,
      },
      update: {
        copilotBubbleImage: bytes,
        copilotBubbleImageUploadedAt: uploadedAt,
      },
    });

    const contentType = platformLogoContentType(body.buf);
    return NextResponse.json({
      hasCopilotBubbleImage: true,
      copilotBubbleImageUploadedAt: uploadedAt.toISOString(),
      publicUrl: copilotBubbleImageUrl(uploadedAt),
      contentType,
    });
  } catch (e) {
    console.error("[master/site-ui/copilot-bubble POST]", e);
    return NextResponse.json({ error: "Could not save image" }, { status: 500 });
  }
}

export async function DELETE() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  try {
    await prisma.siteUiSettings.upsert({
      where: { key: PLATFORM_SITE_UI_KEY },
      create: { key: PLATFORM_SITE_UI_KEY },
      update: { copilotBubbleImage: null, copilotBubbleImageUploadedAt: null },
    });
    return NextResponse.json({ ok: true, hasCopilotBubbleImage: false });
  } catch (e) {
    console.error("[master/site-ui/copilot-bubble DELETE]", e);
    return NextResponse.json({ error: "Could not remove image" }, { status: 500 });
  }
}
