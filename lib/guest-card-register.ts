import "server-only";

import { prisma } from "@/lib/prisma";
import { upsertCheckoutStudent } from "@/lib/checkout-student";
import { ensurePendingOpenPayCard } from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { verifyGuestCardOtp } from "@/lib/guest-card-otp";

export async function registerGuestOpenPayCard(input: {
  organizationId: string;
  email: string;
  otp: string;
}) {
  const settings = await getOpenPayCardPlatformSettings();
  if (!settings.enabled) throw new Error("OpenPayGB card is not available");
  if (!settings.guestCardEnabled) throw new Error("Guest card registration is disabled");

  const verified = await verifyGuestCardOtp(input.organizationId, input.email, input.otp);
  if (!verified.ok) {
    const msg =
      verified.reason === "expired"
        ? "Verification code expired"
        : verified.reason === "locked"
          ? "Too many attempts — request a new code"
          : "Invalid verification code";
    throw new Error(msg);
  }

  const otpRow = await prisma.guestCardOtp.findUnique({ where: { id: verified.rowId } });
  if (!otpRow) throw new Error("Verification session not found");

  const { student } = await upsertCheckoutStudent({
    organizationId: input.organizationId,
    name: otpRow.name || "Guest",
    email: otpRow.email,
    phone: otpRow.phone,
    programmeCode: otpRow.programmeCode || "GUEST",
    year: 1,
    semester: 1,
  });

  const card = await ensurePendingOpenPayCard(student.id, input.organizationId);
  return { studentId: student.id, cardId: card.id, cardStatus: card.status, maskedPan: card.maskedPan };
}
