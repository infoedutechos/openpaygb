import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/master-session";
import { isUnknownSocialLinkIconsFieldError } from "@/lib/site-ui-settings";
import {
  bufferToStoredIcon,
  iconContentTypeFromBuffer,
  isBuiltinSocialKey,
  readSocialLinkIconsMap,
  socialLinkIconUrl,
  validateSocialLinkIconBuffer,
  writeSocialLinkIconsMap,
} from "@/lib/social-link-icons";

type RouteCtx = { params: Promise<{ key: string }> };

async function resolveBodyBuffer(req: Request): Promise<{ ok: true; buf: Buffer } | { ok: false; error: string }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return { ok: false, error: "Invalid multipart body" };
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: 'Expected multipart field "file" with the icon.' };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    return { ok: true, buf };
  }
  return { ok: false, error: 'Use multipart form field "file".' };
}

export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { key: rawKey } = await ctx.params;
  const key = decodeURIComponent(rawKey);
  if (!isBuiltinSocialKey(key)) {
    return NextResponse.json({ error: "Unknown platform key" }, { status: 400 });
  }

  const body = await resolveBodyBuffer(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const validated = validateSocialLinkIconBuffer(body.buf);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 400 });
  }

  const contentType = iconContentTypeFromBuffer(body.buf);
  const stored = bufferToStoredIcon(body.buf, contentType);

  try {
    const icons = await readSocialLinkIconsMap();
    icons[key] = stored;
    await writeSocialLinkIconsMap(icons);
  } catch (err) {
    if (isUnknownSocialLinkIconsFieldError(err)) {
      return NextResponse.json(
        {
          error:
            "Prisma client is out of date. Stop the dev server, run `npx prisma generate`, then start dev again.",
        },
        { status: 503 },
      );
    }
    throw err;
  }

  return NextResponse.json({
    key,
    hasCustomIcon: true,
    iconUrl: socialLinkIconUrl(key, stored),
    uploadedAt: stored.uploadedAt,
  });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { key: rawKey } = await ctx.params;
  const key = decodeURIComponent(rawKey);
  if (!isBuiltinSocialKey(key)) {
    return NextResponse.json({ error: "Unknown platform key" }, { status: 400 });
  }

  try {
    const icons = await readSocialLinkIconsMap();
    delete icons[key];
    await writeSocialLinkIconsMap(icons);
  } catch (err) {
    if (isUnknownSocialLinkIconsFieldError(err)) {
      return NextResponse.json(
        {
          error:
            "Prisma client is out of date. Stop the dev server, run `npx prisma generate`, then start dev again.",
        },
        { status: 503 },
      );
    }
    throw err;
  }

  return NextResponse.json({ key, hasCustomIcon: false, iconUrl: null });
}
