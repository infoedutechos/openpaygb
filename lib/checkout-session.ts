import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAdminFromCookies } from "@/lib/auth";
import { adminCanAccessStudentOrganization } from "@/lib/admin-org-scope";
import { getStudentFromCookies } from "@/lib/student-auth";
import { jwtSecretCheckoutBytes } from "@/lib/jwt-secrets";

const COOKIE = "odelhub_checkout";
const HEADER = "x-checkout-token";

export type CheckoutSessionPayload = {
  sub: string;
  organizationId: string;
};

function getSecret(): Uint8Array {
  const secret = jwtSecretCheckoutBytes();
  if (!secret) {
    throw new Error("JWT_SECRET_CHECKOUT or JWT_SECRET must be set (min 16 chars)");
  }
  return secret;
}

export async function signCheckoutSession(
  payload: CheckoutSessionPayload,
  maxAgeSec = 60 * 60 * 24,
): Promise<string> {
  return new SignJWT({ organizationId: payload.organizationId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getSecret());
}

export async function verifyCheckoutSession(token: string): Promise<CheckoutSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    const organizationId = payload.organizationId;
    if (typeof sub !== "string" || typeof organizationId !== "string") return null;
    return { sub, organizationId };
  } catch {
    return null;
  }
}

function tokenFromRequest(req: Request): string | null {
  const header = req.headers.get(HEADER)?.trim() || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return header || null;
}

async function readCheckoutCookieToken(): Promise<string | null> {
  try {
    const jar = await cookies();
    return jar.get(COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getCheckoutSessionFromRequest(req: Request): Promise<CheckoutSessionPayload | null> {
  const headerToken = tokenFromRequest(req);
  if (headerToken) {
    const v = await verifyCheckoutSession(headerToken);
    if (v) return v;
  }
  const cookieToken = await readCheckoutCookieToken();
  if (cookieToken) {
    return verifyCheckoutSession(cookieToken);
  }
  return null;
}

/** Student portal JWT or checkout session must match student + org. */
export async function assertCheckoutStudentAccess(opts: {
  req: Request;
  studentId: string;
  organizationId: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  let portal: Awaited<ReturnType<typeof getStudentFromCookies>> = null;
  try {
    portal = await getStudentFromCookies();
  } catch {
    portal = null;
  }
  if (portal && portal.sub === opts.studentId && portal.organizationId === opts.organizationId) {
    return { ok: true };
  }

  let admin: Awaited<ReturnType<typeof getAdminFromCookies>> = null;
  try {
    admin = await getAdminFromCookies();
  } catch {
    admin = null;
  }
  if (
    admin &&
    (await adminCanAccessStudentOrganization(admin.sub, admin.role, opts.organizationId))
  ) {
    return { ok: true };
  }

  const checkout = await getCheckoutSessionFromRequest(opts.req);
  if (checkout && checkout.sub === opts.studentId && checkout.organizationId === opts.organizationId) {
    return { ok: true };
  }

  return { ok: false, error: "Unauthorized — start checkout again or sign in to the student portal", status: 401 };
}

export function checkoutSessionCookieName() {
  return COOKIE;
}

export function attachCheckoutSessionCookie(res: Response, token: string): Response {
  const secure = process.env.NODE_ENV === "production";
  res.headers.append(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}${secure ? "; Secure" : ""}`,
  );
  return res;
}
