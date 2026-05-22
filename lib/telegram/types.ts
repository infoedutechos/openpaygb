export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type Chat = {
  id: number;
  type: string;
};

export type Message = {
  message_id: number;
  from?: TelegramUser;
  chat: Chat;
  text?: string;
};

export type CallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: { chat: Chat; message_id: number };
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: Message;
  callback_query?: CallbackQuery;
};

export type InlineKeyboardButton =
  | { text: string; callback_data: string }
  | { text: string; url: string };

export type ReplyMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};
