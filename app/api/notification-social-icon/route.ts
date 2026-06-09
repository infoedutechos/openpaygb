import { NextResponse } from "next/server";
import { getNotificationSocialIconSvg } from "@/lib/notification-social-icon-svg";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim().toLowerCase() ?? "";
  const svg = getNotificationSocialIconSvg(id);
  if (!svg) {
    return NextResponse.json({ error: "Unknown icon" }, { status: 404 });
  }
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
