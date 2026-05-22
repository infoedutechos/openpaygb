import { PaymentRail, type Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyTelegramPaymentConfirmed } from "@/lib/telegram/notify";
import { enqueueUgXtoTonBridge } from "@/lib/bridge/settlement";
import { sendReceiptEmailIfConfigured } from "@/lib/receipt-email";
import { enqueuePartnerWebhooks } from "@/lib/partner-webhooks";

/** Side effects when a payment first reaches `confirmed` (admin, MoMo webhook, etc.). */
export function handleFirstTimeConfirmation(payment: Payment): void {
  notifyTelegramPaymentConfirmed(payment.id);
  if (payment.rail === PaymentRail.momo_bridge) {
    enqueueUgXtoTonBridge(payment);
  }
  void sendReceiptEmailIfConfigured(payment.id).catch((e) => console.error("[receipt-email]", e));
  void prisma.payment
    .findUnique({
      where: { id: payment.id },
      include: { organization: { select: { slug: true, name: true } } },
    })
    .then((row) => {
      if (row) enqueuePartnerWebhooks("payment.confirmed", row);
    })
    .catch((e) => console.error("[partner-webhook]", e));
}
