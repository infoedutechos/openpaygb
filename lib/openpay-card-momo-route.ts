/**
 * Shared helpers for OpenPayGB card MoMo issue/fund API routes.
 */

import { z } from "zod";
import { isLivePayConfigured } from "@/lib/livepay/client";
import { isRelworxConfigured } from "@/lib/relworx/client";
import { isVixonPayConfigured } from "@/lib/vixonpay/client";
import { ugandaPhoneToE164 } from "@/lib/livepay/uganda-phone";
import { ugandaPhoneForVixonPay } from "@/lib/vixonpay/uganda-phone";
import {
  openPayCardMomoSandboxEnabled,
  resolveOpenPayCardMomoRail,
  type OpenPayCardMomoRail,
} from "@/lib/openpay-card-momo-ready";

const E164 = z.string().regex(/^\+\d{10,15}$/);

export const openPayCardMomoRailSchema = z.enum(["livepay", "relworx", "vixonpay", "sandbox"]);

export function resolveAndValidateCardMomoRail(
  requested: string,
): { ok: true; rail: OpenPayCardMomoRail } | { ok: false; error: string; status: number } {
  const resolved = resolveOpenPayCardMomoRail(requested);
  if (!resolved) {
    return {
      ok: false,
      status: 503,
      error:
        "Mobile money is not available. Configure LivePay, Relworx, or VixonPay API keys, or set OPENPAYGB_CARD_MOMO_SANDBOX=1.",
    };
  }
  if (resolved === "sandbox") return { ok: true, rail: "sandbox" };
  if (resolved === "livepay" && !isLivePayConfigured() && !openPayCardMomoSandboxEnabled()) {
    return { ok: false, status: 503, error: "LivePay is not configured" };
  }
  if (resolved === "relworx" && !isRelworxConfigured() && !openPayCardMomoSandboxEnabled()) {
    return { ok: false, status: 503, error: "Relworx is not configured" };
  }
  if (resolved === "vixonpay" && !isVixonPayConfigured() && !openPayCardMomoSandboxEnabled()) {
    return { ok: false, status: 503, error: "VixonPay is not configured" };
  }
  return { ok: true, rail: resolved };
}

export function normalizeCardMomoPhone(
  rail: OpenPayCardMomoRail,
  raw: string,
): { ok: true; phone: string } | { ok: false; error: string } {
  if (rail === "sandbox") {
    const phone = ugandaPhoneToE164(raw.trim()) || raw.trim();
    if (phone.length < 9) return { ok: false, error: "Use a valid Uganda mobile number" };
    return { ok: true, phone };
  }
  if (rail === "vixonpay") {
    const vixonPhone = ugandaPhoneForVixonPay(raw.trim());
    if (!vixonPhone) return { ok: false, error: "Use a valid Uganda mobile number" };
    return { ok: true, phone: vixonPhone };
  }
  const phone = ugandaPhoneToE164(raw.trim());
  if (!phone || !E164.safeParse(phone).success) {
    return { ok: false, error: "Use a valid Uganda mobile number" };
  }
  return { ok: true, phone };
}
