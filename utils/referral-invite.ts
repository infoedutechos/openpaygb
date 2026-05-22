/** Shared Telegram Mini App invite link (Friends + Guild). */

export const REFERRAL_PREFIX = 'ref_';

const DEFAULT_BOT_USERNAME = 'URAPearlsBot';
const DEFAULT_WEBAPP_NAME = 'urapearls';

export function getInviteTarget() {
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || DEFAULT_BOT_USERNAME;
  const fromChannelLink = process.env.NEXT_PUBLIC_CHANNEL_LINK?.match(/t\.me\/[^/]+\/([^/?#]+)/i)?.[1];
  const webAppName = fromChannelLink || DEFAULT_WEBAPP_NAME;
  return { botUsername, webAppName };
}

export function buildInviteLink(telegramId: string): string {
  const { botUsername, webAppName } = getInviteTarget();
  return `https://t.me/${botUsername}/${webAppName}?startapp=${REFERRAL_PREFIX}${telegramId}`;
}
