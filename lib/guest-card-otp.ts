import "server-only";

import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export const GUEST_CARD_OTP_TTL_MS = 15 * 60 * 1000;
export const GUEST_CARD_OTP_MAX_ATTEMPTS = 5;

export function hashGuestCardOtp(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function newGuestCardOtpPlain(): string {
  return String(randomInt(100_000, 999_999));
}

export async function issueGuestCardOtp(input: {
  organizationId: string;
  email: string;
  phone: string;
  name: string;
  programmeCode?: string;
}): Promise<{ expiresAt: Date }> {
  const email = input.email.trim().toLowerCase();
  const plain = newGuestCardOtpPlain();
  const otpHash = hashGuestCardOtp(plain);
  const expiresAt = new Date(Date.now() + GUEST_CARD_OTP_TTL_MS);

  await prisma.guestCardOtp.deleteMany({
    where: { organizationId: input.organizationId, email },
  });

  await prisma.guestCardOtp.create({
    data: {
      organizationId: input.organizationId,
      email,
      phone: input.phone.trim(),
      name: input.name.trim(),
      programmeCode: (input.programmeCode ?? "GUEST").trim().toUpperCase(),
      otpHash,
      expiresAt,
    },
  });

  const subject = "Your OpenPayGB card verification code";
  const html = `<p>Your verification code is <strong>${plain}</strong>. It expires in 15 minutes.</p>`;
  await sendTransactionalEmail({ to: email, subject, html }).catch(() => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[guest-card-otp] dev code", plain, "for", email);
    }
  });

  return { expiresAt };
}

export async function verifyGuestCardOtp(
  organizationId: string,
  email: string,
  otp: string,
): Promise<{ ok: true; rowId: string } | { ok: false; reason: "missing" | "invalid" | "expired" | "locked" }> {
  const normalized = email.trim().toLowerCase();
  const row = await prisma.guestCardOtp.findFirst({
    where: { organizationId, email: normalized },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { ok: false, reason: "missing" };
  if (row.verifiedAt) return { ok: true, rowId: row.id };
  if (row.attempts >= GUEST_CARD_OTP_MAX_ATTEMPTS) return { ok: false, reason: "locked" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const hash = hashGuestCardOtp(otp.trim());
  if (hash !== row.otpHash) {
    await prisma.guestCardOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "invalid" };
  }

  await prisma.guestCardOtp.update({
    where: { id: row.id },
    data: { verifiedAt: new Date() },
  });
  return { ok: true, rowId: row.id };
}
