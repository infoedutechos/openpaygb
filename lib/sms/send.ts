/**
 * Optional SMS via Africa's Talking (Uganda). When unset, callers log stub failures.
 * Env: AFRICAS_TALKING_API_KEY, AFRICAS_TALKING_USERNAME, optional AFRICAS_TALKING_FROM
 */

import { deploymentEnv } from "@/lib/deployment-env-resolve";

export function isSmsConfigured(): boolean {
  return Boolean(deploymentEnv("AFRICAS_TALKING_API_KEY") && deploymentEnv("AFRICAS_TALKING_USERNAME"));
}

export type SmsSendResult = { ok: boolean; providerId?: string; error?: string };

export async function sendSms(opts: { to: string; message: string }): Promise<SmsSendResult> {
  const apiKey = deploymentEnv("AFRICAS_TALKING_API_KEY");
  const username = deploymentEnv("AFRICAS_TALKING_USERNAME");
  if (!apiKey || !username) {
    return { ok: false, error: "SMS not configured (AFRICAS_TALKING_API_KEY / USERNAME)." };
  }

  let to = opts.to.replace(/[\s\-()]/g, "").trim();
  if (to.startsWith("+")) to = to.slice(1);
  if (/^0\d{9}$/.test(to)) to = `256${to.slice(1)}`;
  if (!/^\d{10,15}$/.test(to)) {
    return { ok: false, error: "Invalid SMS recipient phone" };
  }

  const from = deploymentEnv("AFRICAS_TALKING_FROM") || undefined;
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("to", `+${to}`);
  body.set("message", opts.message.slice(0, 480));
  if (from) body.set("from", from);

  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as {
    SMSMessageData?: { Recipients?: { status?: string; messageId?: string; statusCode?: number }[] };
    errorMessage?: string;
  };

  if (!res.ok) {
    return { ok: false, error: json.errorMessage || `SMS provider HTTP ${res.status}` };
  }

  const recipient = json.SMSMessageData?.Recipients?.[0];
  const status = (recipient?.status || "").toLowerCase();
  if (status.includes("success") || recipient?.statusCode === 100 || recipient?.statusCode === 101) {
    return { ok: true, providerId: recipient?.messageId };
  }
  return {
    ok: false,
    error: recipient?.status || "SMS provider did not accept message",
    providerId: recipient?.messageId,
  };
}

/** WhatsApp Cloud API stub — configure later; returns clear not-configured. */
export function isWhatsAppConfigured(): boolean {
  return Boolean(deploymentEnv("WHATSAPP_TOKEN") && deploymentEnv("WHATSAPP_PHONE_NUMBER_ID"));
}

export async function sendWhatsApp(opts: { to: string; message: string }): Promise<SmsSendResult> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, error: "WhatsApp not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)." };
  }
  const token = deploymentEnv("WHATSAPP_TOKEN");
  const phoneId = deploymentEnv("WHATSAPP_PHONE_NUMBER_ID");
  let to = opts.to.replace(/\D/g, "");
  if (/^0\d{9}$/.test(to)) to = `256${to.slice(1)}`;

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: opts.message.slice(0, 1000) },
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string }; messages?: { id?: string }[] };
  if (!res.ok) {
    return { ok: false, error: json.error?.message || `WhatsApp HTTP ${res.status}` };
  }
  return { ok: true, providerId: json.messages?.[0]?.id };
}
