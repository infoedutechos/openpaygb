import { NextResponse } from "next/server";
import {
  isBuiltinSocialKey,
  readSocialLinkIconsMap,
  storedIconToBuffer,
} from "@/lib/social-link-icons";

type RouteCtx = { params: Promise<{ key: string }> };

/** Public per-platform social icon (master upload). */
export async function GET(_req: Request, ctx: RouteCtx) {
  const { key: rawKey } = await ctx.params;
  const key = decodeURIComponent(rawKey);
  if (!isBuiltinSocialKey(key)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 404 });
  }

  try {
    const icons = await readSocialLinkIconsMap();
    const icon = icons[key];
    if (!icon) {
      return NextResponse.json({ error: "No icon" }, { status: 404 });
    }
    const bytes = storedIconToBuffer(icon);
    if (!bytes?.length) {
      return NextResponse.json({ error: "Invalid icon data" }, { status: 404 });
    }
    const updated = Math.floor(new Date(icon.uploadedAt).getTime() / 1000).toString(16);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": icon.contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        ETag: `"social-icon-${key}-${updated}"`,
      },
    });
  } catch (e) {
    console.error("[social-icon GET]", key, e);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
