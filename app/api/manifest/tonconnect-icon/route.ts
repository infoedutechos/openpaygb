import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getPlatformLogoRecord } from "@/lib/platform-logo";

/** TON Connect manifest icon — platform logo when uploaded, else bundled SVG. */
export async function GET() {
  try {
    const { bytes, uploadedAt, contentType } = await getPlatformLogoRecord();
    if (bytes?.length && uploadedAt && contentType) {
      const updated = Math.floor(uploadedAt.getTime() / 1000).toString(16);
      return new NextResponse(new Uint8Array(bytes), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, immutable",
          ETag: `"tonconnect-icon-${updated}"`,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const svg = readFileSync(join(process.cwd(), "public", "playhub", "favicon.svg"), "utf8");
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("[tonconnect-icon GET]", e);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
