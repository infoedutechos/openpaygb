import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { PLATFORM_LOGO_PATH, platformLogoUrl } from "@/lib/platform-logo";
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
      return { ok: false, error: 'Expected multipart field "file" with the logo.' };
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
    select: { platformLogoUploadedAt: true },
  });

  const uploadedAt = row?.platformLogoUploadedAt ?? null;
  return NextResponse.json({
    hasPlatformLogo: Boolean(uploadedAt),
    platformLogoUploadedAt: uploadedAt?.toISOString() ?? null,
    publicUrl: platformLogoUrl(uploadedAt),
    path: PLATFORM_LOGO_PATH,
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
        platformLogo: bytes,
        platformLogoUploadedAt: uploadedAt,
      },
      update: {
        platformLogo: bytes,
        platformLogoUploadedAt: uploadedAt,
      },
    });

    const contentType = platformLogoContentType(body.buf);
    return NextResponse.json({
      hasPlatformLogo: true,
      platformLogoUploadedAt: uploadedAt.toISOString(),
      publicUrl: platformLogoUrl(uploadedAt),
      contentType,
    });
  } catch (e) {
    console.error("[master/site-ui/logo POST]", e);
    return NextResponse.json({ error: "Could not save logo" }, { status: 500 });
  }
}

export async function DELETE() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  try {
    await prisma.siteUiSettings.upsert({
      where: { key: PLATFORM_SITE_UI_KEY },
      create: { key: PLATFORM_SITE_UI_KEY },
      update: { platformLogo: null, platformLogoUploadedAt: null },
    });
    return NextResponse.json({ ok: true, hasPlatformLogo: false });
  } catch (e) {
    console.error("[master/site-ui/logo DELETE]", e);
    return NextResponse.json({ error: "Could not remove logo" }, { status: 500 });
  }
}
