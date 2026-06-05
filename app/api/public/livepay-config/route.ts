import { NextResponse } from "next/server";

import { isLivePayConfigured } from "@/lib/livepay/client";

import { getLivePayWebhookUrl } from "@/lib/livepay/webhook-url";



/** Public flag: Uganda LivePay checkout available when platform keys are set. */

export async function GET() {

  return NextResponse.json({

    enabled: isLivePayConfigured(),

    networks: ["MTN", "AIRTEL"],

    currency: "UGX",

    webhookUrl: getLivePayWebhookUrl(),

    webhookSecretConfigured: Boolean(process.env.LIVEPAY_WEBHOOK_SECRET?.trim()),

  });

}


