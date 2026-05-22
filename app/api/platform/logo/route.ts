import { NextResponse } from "next/server";
import { getPlatformLogoRecord } from "@/lib/platform-logo";

/** Public platform icon/logo (master upload). Used for favicon, PWA, and share previews. */
export async function GET() {
  try {
    const { bytes, uploadedAt, contentType } = await getPlatformLogoRecord();
    if (!bytes?.length || !uploadedAt || !contentType) {
      return NextResponse.json({ error: "No platform logo" }, { status: 404 });
    }

    const updated = Math.floor(uploadedAt.getTime() / 1000).toString(16);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        ETag: `"platform-logo-${updated}"`,
      },
    });
  } catch (e) {
    console.error("[platform logo GET]", e);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
