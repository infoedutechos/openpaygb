/**
 * Telegram Bot API – send messages to users
 * Used for optional notifications (e.g. Send/Receive PEARLS)
 */

/** One inline button (under the message). Use url for links, or callback_data for bot handling. */
export type TelegramInlineButton = { text: string; url?: string; callback_data?: string };

/** One reply keyboard button (custom keyboard shown in chat). */
export type TelegramReplyButton = { text: string };

/** Optional keyboards so the bot message looks like the Humidifi/MissionPawsible style: link + inline button + custom keyboard. */
export type TelegramSendOptions = {
  /** Inline keyboard: rows of buttons attached to the message (e.g. "VIEW CHANNEL"). */
  inlineKeyboard?: TelegramInlineButton[][];
  /** Reply keyboard: custom keyboard shown to the user (e.g. "Tap to Play", "Follow our Channel"). */
  replyKeyboard?: TelegramReplyButton[][];
};

/**
 * Send a Telegram message to a user by their chat_id (Telegram user ID).
 * Returns the Telegram message_id if sent successfully, false otherwise.
 * (Used for recall: we store message_id so we can delete the message later.)
 * Does not throw – failures are logged and swallowed so the main flow is not affected.
 *
 * Use options to add inline buttons (e.g. "VIEW CHANNEL") and/or a custom reply keyboard
 * (e.g. "Tap to Play", "Follow our Channel", "How to earn") so the message appears
 * in users' bot chats like the MissionPawsible-style UI.
 *
 * Note: The user must have initiated a conversation with the bot (e.g. opened the Mini App)
 * for the bot to be able to send them messages.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: TelegramSendOptions
): Promise<number | false> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return false;
  }

  // Telegram allows only one reply_markup type per message. If both are provided, send two messages.
  const hasInline = options?.inlineKeyboard?.length;
  const hasReply = options?.replyKeyboard?.length;

  const sendOne = async (msgText: string, replyMarkup: unknown): Promise<number | false> => {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: msgText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[telegram-notify] sendMessage failed:', res.status, err);
      return false;
    }
    const data = (await res.json()) as { result?: { message_id?: number } };
    const id = data?.result?.message_id;
    return typeof id === 'number' ? id : false;
  };

  try {
    if (hasInline && hasReply) {
      const id1 = await sendOne(text, { inline_keyboard: options!.inlineKeyboard });
      await sendOne('\u200b', { keyboard: options!.replyKeyboard!, resize_keyboard: true, one_time_keyboard: false });
      return id1;
    }
    if (hasInline) {
      return sendOne(text, { inline_keyboard: options!.inlineKeyboard });
    }
    if (hasReply) {
      return sendOne(text, { keyboard: options!.replyKeyboard!, resize_keyboard: true, one_time_keyboard: false });
    }
    return sendOne(text, undefined);
  } catch (err) {
    console.warn('[telegram-notify] sendMessage error:', err);
    return false;
  }
}

/**
 * Send a photo to a user's chat with optional caption and inline keyboard.
 * Use this when you want your logo/emoji image above the message and buttons (e.g. Afro Lumens icon above "Tap to Play").
 * Returns message_id if sent, false otherwise.
 */
export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption: string,
  options?: Pick<TelegramSendOptions, 'inlineKeyboard'>
): Promise<number | false> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken || !photoUrl?.trim()) return false;

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      photo: photoUrl.trim(),
      caption,
      parse_mode: 'HTML',
    };
    if (options?.inlineKeyboard?.length) {
      payload.reply_markup = { inline_keyboard: options.inlineKeyboard };
    }
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[telegram-notify] sendPhoto failed:', res.status, err);
      return false;
    }
    const data = (await res.json()) as { result?: { message_id?: number } };
    const id = data?.result?.message_id;
    return typeof id === 'number' ? id : false;
  } catch (err) {
    console.warn('[telegram-notify] sendPhoto error:', err);
    return false;
  }
}

/**
 * Delete a message sent by the bot from a user's chat (for recall).
 * Returns true if deleted, false otherwise.
 */
export async function deleteTelegramMessage(chatId: string, messageId: number): Promise<boolean> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return false;
  try {
    const url = `https://api.telegram.org/bot${botToken}/deleteMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[telegram-notify] deleteMessage failed:', res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[telegram-notify] deleteMessage error:', err);
    return false;
  }
}

/**
 * Notify sender and recipient about an PEARLS transfer.
 * Runs asynchronously and does not block the response.
 * Failures are logged but do not affect the transfer.
 */
export function notifyTransfer(
  senderTelegramId: string,
  recipientTelegramId: string,
  amount: number,
  senderName: string,
  recipientName: string
): void {
  const formattedAmount = amount.toLocaleString();

  const senderMessage = `✅ You sent <b>${formattedAmount} PEARLS</b> to ${escapeHtml(recipientName)}.`;
  const recipientMessage = `🎉 You received <b>${formattedAmount} PEARLS</b> from ${escapeHtml(senderName)}.`;

  // Fire-and-forget: don't await, don't block the response
  Promise.all([
    sendTelegramMessage(senderTelegramId, senderMessage),
    sendTelegramMessage(recipientTelegramId, recipientMessage),
  ]).catch((err) => console.warn('[telegram-notify] notifyTransfer error:', err));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Broadcast a donation announcement to all given users via Telegram only.
 * Does NOT create any Notification record – so it will not appear in the in-app notification center.
 * Fire-and-forget; rate-limited in batches so the main response is not blocked.
 */
export function broadcastDonationToUsers(
  donorName: string,
  amount: number,
  telegramIds: string[]
): void {
  if (telegramIds.length === 0) return;
  const formattedAmount = amount.toLocaleString();
  const safeName = escapeHtml(donorName.trim() || 'Someone');
  const text = `❤️ <b>${safeName}</b> donated <b>${formattedAmount} PEARLS</b> to charity.`;

  const BATCH_SIZE = 25;
  const delayMs = 1100;
  (async () => {
    for (let offset = 0; offset < telegramIds.length; offset += BATCH_SIZE) {
      const batch = telegramIds.slice(offset, offset + BATCH_SIZE);
      await Promise.all(batch.map((chatId) => sendTelegramMessage(chatId, text)));
      if (offset + BATCH_SIZE < telegramIds.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  })().catch((err) => console.warn('[telegram-notify] broadcastDonationToUsers error:', err));
}

/** Build announcement message as HTML (for in-chat broadcast, like Humidifi-style updates). */
export function formatAnnouncementMessage(title: string, body: string): string {
  const safeTitle = escapeHtml(title.trim());
  const safeBody = body.trim() ? escapeHtml(body.trim()) : '';
  return safeBody
    ? `🚀 <b>${safeTitle}</b>\n\n${safeBody}`
    : `🚀 <b>${safeTitle}</b>`;
}

/**
 * Send a notification to each user's Telegram bot chat (same content as in-app notification).
 * Fire-and-forget; batched so the main response is not blocked.
 * Use this when creating a notification so it appears both in-app (and user profile) and in the user's bot chat.
 */
export function broadcastNotificationToUserBotChats(
  telegramIds: string[],
  title: string,
  body: string,
  imageUrl?: string | null
): void {
  const ids = telegramIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (ids.length === 0) return;

  const messageText = formatAnnouncementMessage(title, body);
  const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;

  const BATCH_SIZE = 25;
  const delayMs = 1100;
  (async () => {
    for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
      const batch = ids.slice(offset, offset + BATCH_SIZE);
      await Promise.all(
        batch.map((chatId) =>
          hasImage
            ? sendTelegramPhoto(chatId, imageUrl!.trim(), messageText)
            : sendTelegramMessage(chatId, messageText)
        )
      );
      if (offset + BATCH_SIZE < ids.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  })().catch((err) => console.warn('[telegram-notify] broadcastNotificationToUserBotChats error:', err));
}

/**
 * Send an announcement to your Telegram channel (e.g. where "Play now" / Mini App link is).
 * Set TELEGRAM_ANNOUNCEMENT_CHANNEL_ID in env (e.g. @yourchannel or -1001234567890).
 * The bot must be an admin in the channel.
 * Returns true if sent, false if channel not configured or send failed.
 */
export async function sendAnnouncementToChannel(
  title: string,
  body: string,
  imageUrl?: string | null
): Promise<boolean> {
  const botToken = process.env.BOT_TOKEN;
  const channelId = process.env.TELEGRAM_ANNOUNCEMENT_CHANNEL_ID?.trim();
  if (!botToken || !channelId) {
    return false;
  }

  const text = body.trim()
    ? `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`
    : `<b>${escapeHtml(title)}</b>`;

  try {
    if (imageUrl?.trim()) {
      const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          photo: imageUrl.trim(),
          caption: text,
          parse_mode: 'HTML',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[telegram-notify] sendPhoto to channel failed:', res.status, err);
        return false;
      }
      return true;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[telegram-notify] sendMessage to channel failed:', res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[telegram-notify] sendAnnouncementToChannel error:', err);
    return false;
  }
}
