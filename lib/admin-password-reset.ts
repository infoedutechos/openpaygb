import { createHash, randomBytes } from "crypto";

export function hashAdminResetToken(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function newAdminResetTokenPlain(): string {
  return randomBytes(32).toString("base64url");
}

/** Short session when "Remember me" is off; long-lived when on. */
export const ADMIN_SESSION_MAX_AGE_SEC = 60 * 60 * 8;
export const ADMIN_REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 30;
