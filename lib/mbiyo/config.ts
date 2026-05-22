import { OPEN_PAY_GLOBAL_NAME } from "@/lib/open-pay-brand";

export function isMbiyoConfigured(): boolean {
  return Boolean(process.env.MBIYO_SECRET_KEY?.trim());
}

export function mbiyoNotConfiguredMessage(): string {
  return `${OPEN_PAY_GLOBAL_NAME} mobile money is not configured on this server. Add MBIYO_SECRET_KEY from https://dashboard.mbiyo.africa to .env and restart \`npm run dev\`.`;
}
