import { jwtVerify } from "jose";
import { jwtSecretStudentBytes } from "@/lib/jwt-secrets";

export type StaffJwtPayload = {
  sub: string;
  organizationId: string;
};

/** Verify staff session JWT (Edge-safe). Uses student JWT secret family. */
export async function verifyStaffJwt(token: string): Promise<StaffJwtPayload | null> {
  try {
    const secret = jwtSecretStudentBytes();
    if (!secret) return null;
    const { payload } = await jwtVerify(token, secret);
    if (payload.typ !== "staff") return null;
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const organizationId =
      typeof payload.organizationId === "string" ? payload.organizationId : null;
    if (!sub || !organizationId) return null;
    return { sub, organizationId };
  } catch {
    return null;
  }
}
