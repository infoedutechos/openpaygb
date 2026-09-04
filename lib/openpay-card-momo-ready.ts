/**
 * Uganda MTN/Airtel MoMo for OpenPayGB card issue + fund.
 * Live rails: LivePay, Relworx, VixonPay — **any one configured = fully operational**.
 * Sandbox only when no UG PSP keys (dev) or OPENPAYGB_CARD_MOMO_SANDBOX=1.
 */

import { warmDeploymentEnvCache, deploymentEnv } from "@/lib/deployment-env-resolve";
import { isLivePayConfigured } from "@/lib/livepay/client";
import { isRelworxConfigured } from "@/lib/relworx/client";
import { isVixonPayConfigured } from "@/lib/vixonpay/client";
import {
  getOpenPayCardPlatformSettings,
  patchOpenPayCardPlatformSettings,
} from "@/lib/openpay-card-settings";
import {
  getPaymentProviderPolicy,
  isPaymentProviderEnabledByMaster,
  savePaymentProviderPolicy,
} from "@/lib/payment-provider-policy";

export type OpenPayCardMomoRail = "livepay" | "relworx" | "vixonpay" | "sandbox";

/** Call before any is*Configured() so Master dashboard overrides are visible. */
export async function warmOpenPayCardMomoEnv(): Promise<void> {
  await warmDeploymentEnvCache();
}

function sandboxFlag(): string {
  return (deploymentEnv("OPENPAYGB_CARD_MOMO_SANDBOX") || process.env.OPENPAYGB_CARD_MOMO_SANDBOX || "")
    .trim()
    .toLowerCase();
}

export function anyUgCardMomoLiveConfigured(): boolean {
  return isLivePayConfigured() || isRelworxConfigured() || isVixonPayConfigured();
}

/**
 * Sandbox only when forced on, or (non-prod and no live UG rail).
 * If any LivePay/Relworx/VixonPay key pair exists → live USSD (sandbox off unless forced).
 */
export function openPayCardMomoSandboxEnabled(): boolean {
  const flag = sandboxFlag();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (anyUgCardMomoLiveConfigured()) return false;
  return process.env.NODE_ENV !== "production";
}

export function isOpenPayCardMomoLiveRailConfigured(
  rail: Exclude<OpenPayCardMomoRail, "sandbox">,
): boolean {
  if (rail === "livepay") return isLivePayConfigured();
  if (rail === "relworx") return isRelworxConfigured();
  return isVixonPayConfigured();
}

/** Preferred live rail (any one is enough). Order: LivePay → VixonPay → Relworx. */
export function preferredOpenPayCardMomoLiveRail(): Exclude<OpenPayCardMomoRail, "sandbox"> | null {
  if (isLivePayConfigured()) return "livepay";
  if (isVixonPayConfigured()) return "vixonpay";
  if (isRelworxConfigured()) return "relworx";
  return null;
}

/**
 * Resolve rail. If the requested rail is missing but another UG MoMo rail is configured,
 * use that rail — one provider is enough for full operation.
 */
export function resolveOpenPayCardMomoRail(requested?: string | null): OpenPayCardMomoRail | null {
  const live = preferredOpenPayCardMomoLiveRail();
  const sandboxOk = openPayCardMomoSandboxEnabled();
  const r = (requested || "").toLowerCase();

  if (r === "livepay" || r === "relworx" || r === "vixonpay") {
    if (isOpenPayCardMomoLiveRailConfigured(r)) return r;
    if (live) return live;
    if (sandboxOk) return "sandbox";
    return null;
  }

  if (r === "sandbox") {
    if (sandboxOk) return "sandbox";
    if (live) return live;
    return null;
  }

  if (live) return live;
  if (sandboxOk) return "sandbox";
  return null;
}

export async function ensureOpenPayCardMomoProductActive(): Promise<{
  cardEnabled: boolean;
  providersEnabled: boolean;
  liveRail: Exclude<OpenPayCardMomoRail, "sandbox"> | null;
}> {
  await warmOpenPayCardMomoEnv();

  const settings = await getOpenPayCardPlatformSettings();
  if (!settings.enabled) {
    await patchOpenPayCardPlatformSettings({ enabled: true });
  }

  const policy = await getPaymentProviderPolicy();
  const live = preferredOpenPayCardMomoLiveRail();
  const needOn = ["openpay_card"] as string[];
  if (live) needOn.push(live);
  // Keep other UG rails enabled if configured so Master toggles don't hide them.
  for (const id of ["livepay", "relworx", "vixonpay"] as const) {
    if (isOpenPayCardMomoLiveRailConfigured(id)) needOn.push(id);
  }

  const need = needOn.filter((id) => !isPaymentProviderEnabledByMaster(id, policy));
  if (need.length) {
    const next: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(policy)) {
      if (typeof v === "boolean") next[k] = v;
    }
    for (const id of need) next[id] = true;
    await savePaymentProviderPolicy(next);
  }

  return { cardEnabled: true, providersEnabled: true, liveRail: live };
}

export async function getOpenPayCardMomoPublicConfig() {
  const ensured = await ensureOpenPayCardMomoProductActive();
  const sandbox = openPayCardMomoSandboxEnabled();
  const live = ensured.liveRail;
  const rails = {
    livepay: isLivePayConfigured(),
    vixonpay: isVixonPayConfigured(),
    relworx: isRelworxConfigured(),
    sandbox,
  };
  const enabled = Boolean(live || sandbox);
  return {
    enabled,
    sandbox,
    preferredRail: (live || (sandbox ? "sandbox" : null)) as OpenPayCardMomoRail | null,
    rails,
    networks: ["MTN", "AIRTEL"] as const,
    currency: "UGX",
    mac: {
      deploymentEnv: "/admin/master#deployment-environment",
      livepay: "/admin/master#deployment-env-livepay",
      relworx: "/admin/master#deployment-env-relworx",
      vixonpay: "/admin/master#deployment-env-vixonpay",
      paymentProviders: "/admin/master#payment-providers",
      openPayCard: "/admin/master#openpay-card-settings",
    },
    note: live
      ? `Live MoMo via ${live} — approve the USSD/prompt on your phone; balance updates after the webhook.`
      : sandbox
        ? "Sandbox MoMo (dev): no LivePay/Relworx/VixonPay API keys in Master Environment yet — activate/fund confirms instantly. Set any one provider under Master → Deployment environment for real MTN/Airtel."
        : "Set LIVEPAY_API_KEY + LIVEPAY_ACCOUNT_NUMBER (or Relworx / VixonPay) in Master → Deployment environment.",
  };
}
