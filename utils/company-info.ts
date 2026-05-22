/**
 * Open Innovations Platforms and Technologies — official identity and public links.
 * Fill in the URL fields when you have live endpoints; empty strings are skipped in `/api/license`.
 */

export const OPEN_INNOVATIONS = {
  legalName: 'Open Innovations Platforms and Technologies',
  website: '',
  youtubeUrl: '',
  telegramUrl: '',
  /** e.g. https://t.me/your_channel */
  telegramNewsChannelUrl: '',
  /** Chat username for TELEGRAM task checks, e.g. my_channel (no @) */
  telegramNewsChatId: '',
  githubUrl: '',
  /** e.g. https://x.com/your_handle */
  xTwitterUrl: '',
};

/** Plain-text license body for `GET /api/license` and internal use. */
export function openInnovationsLicensePlainText(): string {
  const { legalName } = OPEN_INNOVATIONS;
  const lines: string[] = [
    `This project was developed by ${legalName}.`,
    '',
    `Copyright (c) ${legalName}. All rights reserved.`,
    'Unauthorized use, reproduction, or distribution outside terms agreed with ' +
      `${legalName} is prohibited.`,
    '',
  ];
  const add = (label: string, url: string) => {
    const u = url.trim();
    if (u) lines.push(`${label}: ${u}`);
  };
  add('Website', OPEN_INNOVATIONS.website);
  add('YouTube', OPEN_INNOVATIONS.youtubeUrl);
  add('Telegram', OPEN_INNOVATIONS.telegramUrl);
  add('Telegram channel for news/updates', OPEN_INNOVATIONS.telegramNewsChannelUrl);
  add('GitHub', OPEN_INNOVATIONS.githubUrl);
  add('X (Twitter)', OPEN_INNOVATIONS.xTwitterUrl);
  return lines.join('\n');
}
