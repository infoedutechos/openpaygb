import { NextResponse } from "next/server";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isMbiyoActiveForCheckout } from "@/lib/payment-provider-active";
import { mbiyoSupportedCountryCodes } from "@/lib/mbiyo/supported-countries";

export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json({
    enabled: await isMbiyoActiveForCheckout(),
    countries: mbiyoSupportedCountryCodes(),
  });
}
