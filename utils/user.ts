// utils/user.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { DEV_PREVIEW_TELEGRAM_ID } from '@/utils/dev-auth-constants';

function isDevBypassInitData(initData: string): boolean {
  const t = (initData ?? '').trim();
  return t === 'dev-local-bypass' || t === 'temp';
}

export function getUserTelegramId(initData: string): string | null {
  if (isDevBypassInitData(initData)) return DEV_PREVIEW_TELEGRAM_ID;
  try {
    // Decode the URL-encoded string
    const decodedInitData = decodeURIComponent(initData);

    // Parse the query string
    const params = new URLSearchParams(decodedInitData);

    // Get the 'user' parameter and parse it as JSON
    const userString = params.get('user');
    if (!userString) {
      return null;
    }

    const user = JSON.parse(userString);
    return user.id?.toString() || null;
  } catch (error) {
    console.error('Error parsing initData:', error);
    return null;
  }
}