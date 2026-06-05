import { NextResponse } from "next/server";
import { z } from "zod";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { upsertCheckoutStudent } from "@/lib/checkout-student";
import {
  attachCheckoutSessionCookie,
  signCheckoutSession,
} from "@/lib/checkout-session";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  organizationSlug: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  programmeCode: z.string().min(2),
  year: z.number().int().min(1).max(6),
  semester: z.number().int().min(1).max(3),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`checkout-student:${ip}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await assertActiveOrganizationSlug(parsed.data.organizationSlug.trim().toLowerCase());

    const { student: doc, created } = await upsertCheckoutStudent({
      organizationId: org.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      programmeCode: parsed.data.programmeCode,
      year: parsed.data.year,
      semester: parsed.data.semester,
    });

    const checkoutToken = await signCheckoutSession({
      sub: doc.id,
      organizationId: org.id,
    });

    const res = NextResponse.json(
      {
        student: {
          id: doc.id,
          name: doc.name,
          programmeCode: doc.programmeCode,
          year: doc.year,
          semester: doc.semester,
        },
        checkoutToken,
      },
      { status: created ? 201 : 200 },
    );
    attachCheckoutSessionCookie(res, checkoutToken);
    return res;
  } catch (e) {
    return apiErrorResponse(e, {
      route: "checkout/student",
      fallback: "Could not create student",
    });
  }
}
