import { getTmaAppUrl } from "@/lib/telegram/tma-url";
import type { InlineKeyboardMarkup, ReplyKeyboardMarkup } from "@/lib/telegram/types";

/** Persistent reply keyboard shown on bot landing (fintech-style, not command menus). */
export function tmaLandingReplyKeyboard(): ReplyKeyboardMarkup {
  return {
    keyboard: [
      [{ text: "🎓 Student Portal" }, { text: "💳 OpenPay Card" }],
      [{ text: "🏫 Schools" }, { text: "🧾 Receipts" }],
      [{ text: "💰 Pay Fees" }, { text: "⚙ Settings" }],
      [{ text: "📞 Support" }, { text: "ℹ About" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/** Inline row with primary Web App launch button. */
export function tmaOpenAppInlineKeyboard(startParam?: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "Open App", web_app: { url: getTmaAppUrl(startParam) } }],
    ],
  };
}

export function tmaLandingCombinedMarkup(startParam?: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "📱 Open App", web_app: { url: getTmaAppUrl(startParam) } }],
      [
        { text: "💰 Pay tuition", callback_data: "tma:pay" },
        { text: "🧾 Receipts", callback_data: "tma:receipts" },
      ],
      [
        { text: "💳 Card", callback_data: "tma:card" },
        { text: "📊 Balance", callback_data: "tma:balance" },
      ],
    ],
  };
}

/** Map reply-keyboard labels to TMA deep-link tabs. */
export const TMA_REPLY_KEYBOARD_ROUTES: Record<string, string> = {
  "🎓 Student Portal": "home",
  "💳 OpenPay Card": "card",
  "🏫 Schools": "schools",
  "🧾 Receipts": "history",
  "💰 Pay Fees": "pay",
  "⚙ Settings": "profile",
  "📞 Support": "support",
  "ℹ About": "about",
};
