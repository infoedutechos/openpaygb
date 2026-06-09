import "server-only";

import { isMbiyoConfigured } from "@/lib/mbiyo/config";
import { isLivePayConfigured } from "@/lib/livepay/client";
import { isRelworxConfigured } from "@/lib/relworx/client";
import { isVixonPayConfigured } from "@/lib/vixonpay/client";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import {
  getPaymentProviderPolicy,
  isPaymentProviderEnabledByMaster,
} from "@/lib/payment-provider-policy";

export async function isLivePayActiveForCheckout(): Promise<boolean> {
  const policy = await getPaymentProviderPolicy();
  return isLivePayConfigured() && isPaymentProviderEnabledByMaster("livepay", policy);
}

export async function isRelworxActiveForCheckout(): Promise<boolean> {
  const policy = await getPaymentProviderPolicy();
  return isRelworxConfigured() && isPaymentProviderEnabledByMaster("relworx", policy);
}

export async function isVixonPayActiveForCheckout(): Promise<boolean> {
  const policy = await getPaymentProviderPolicy();
  return isVixonPayConfigured() && isPaymentProviderEnabledByMaster("vixonpay", policy);
}

export async function isMbiyoActiveForCheckout(): Promise<boolean> {
  const policy = await getPaymentProviderPolicy();
  return isMbiyoConfigured() && isPaymentProviderEnabledByMaster("mbiyo", policy);
}

export async function isTonActiveForCheckout(): Promise<boolean> {
  const { deploymentEnv } = await import("@/lib/deployment-env-resolve");
  const policy = await getPaymentProviderPolicy();
  return (
    Boolean(deploymentEnv("ODELHUB_TON_WALLET_ADDRESS")) &&
    isPaymentProviderEnabledByMaster("ton", policy)
  );
}

export async function isOpenPayCardActiveForCheckout(): Promise<boolean> {
  const settings = await getOpenPayCardPlatformSettings();
  return settings.enabled;
}
