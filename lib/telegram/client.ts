import type { ReplyMarkup } from "./types";

function getToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t?.trim()) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t.trim();
}

type TgOk<T> = { ok: true; result: T } | { ok: false; description?: string; error_code?: number };

export async function tgApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = getToken();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as TgOk<T>;
  if (!j.ok) {
    throw new Error(j.description ?? `Telegram API ${method} failed`);
  }
  return j.result;
}

export async function sendMessageHtml(
  chatId: number | string,
  text: string,
  replyMarkup?: ReplyMarkup
) {
  return tgApi<unknown>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
  return tgApi<true>("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
    show_alert: showAlert,
  });
}

export async function editMessageTextHtml(
  chatId: number | string,
  messageId: number,
  text: string,
  replyMarkup?: ReplyMarkup
) {
  return tgApi<unknown>("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}
