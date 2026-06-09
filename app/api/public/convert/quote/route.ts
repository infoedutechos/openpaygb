import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteConvert } from "@/lib/convert-quote";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  direction: z.enum(["ugx_to_ton", "ton_to_ugx"]),
  amount: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`convert-quote:${clientIp(req)}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const quote = await quoteConvert(parsed.data.direction, parsed.data.amount);
    if (!quote) return NextResponse.json({ error: "Quote unavailable" }, { status: 503 });

    return NextResponse.json({ quote });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/public/convert/quote" });
  }
}
