import { OPEN_PAY_BRAND, PAYMENT_RAIL_MBIYO } from "@/lib/open-pay-brand";
import { deploymentEnv } from "@/lib/deployment-env-resolve";

export function isMbiyoConfigured(): boolean {
  return Boolean(deploymentEnv("MBIYO_SECRET_KEY"));
}

export function mbiyoNotConfiguredMessage(): string {
  return `${PAYMENT_RAIL_MBIYO} (${OPEN_PAY_BRAND}) is not configured. Add MBIYO_SECRET_KEY from https://dashboard.mbiyo.africa to .env and restart \`npm run dev\`.`;
}
