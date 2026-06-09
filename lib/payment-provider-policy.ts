import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { PAYMENT_PROVIDER_CODES } from "@/lib/payment-providers-catalog";
import { parsePaymentProviderPolicy, type PaymentProviderPolicy } from "@/lib/payment-provider-policy-shared";

export type { PaymentProviderPolicy } from "@/lib/payment-provider-policy-shared";
export { isPaymentProviderEnabledByMaster } from "@/lib/payment-provider-policy-shared";

export async function getPaymentProviderPolicy(): Promise<PaymentProviderPolicy> {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: { paymentProviderPolicy: true },
  });
  return parsePaymentProviderPolicy(row?.paymentProviderPolicy);
}

export async function savePaymentProviderPolicy(
  patch: PaymentProviderPolicy,
): Promise<PaymentProviderPolicy> {
  const current = await getPaymentProviderPolicy();
  const next: PaymentProviderPolicy = { ...current };

  for (const code of PAYMENT_PROVIDER_CODES) {
    if (Object.prototype.hasOwnProperty.call(patch, code)) {
      next[code] = patch[code] === true;
    }
  }

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: { key: PLATFORM_SITE_UI_KEY, paymentProviderPolicy: next },
    update: { paymentProviderPolicy: next },
  });

  return next;
}
