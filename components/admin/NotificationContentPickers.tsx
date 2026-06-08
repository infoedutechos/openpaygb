"use client";

import {
  NOTIFICATION_EMOJI_LIBRARY,
  NOTIFICATION_SOCIAL_LOGO_LIBRARY,
  appendEmojiToText,
} from "@/lib/notification-content-libraries";

type Props = {
  title: string;
  body: string;
  imageUrl: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
};

export function NotificationContentPickers({
  title,
  body,
  imageUrl,
  onTitleChange,
  onBodyChange,
  onImageUrlChange,
}: Props) {
  function insertEmoji(emoji: string, target: "title" | "body") {
    if (target === "title") onTitleChange(appendEmojiToText(title, emoji));
    else onBodyChange(appendEmojiToText(body, emoji));
  }

  return (
    <div className="md:col-span-2 space-y-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">Emoji library</p>
        <p className="mt-1 text-[11px] text-slate-500">Tap to append to title or message.</p>
        <div className="mt-3 space-y-3">
          {NOTIFICATION_EMOJI_LIBRARY.map((cat) => (
            <div key={cat.id}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{cat.label}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cat.emojis.map((emoji) => (
                  <span key={`${cat.id}-${emoji}`} className="inline-flex gap-0.5">
                    <button
                      type="button"
                      title={`Add ${emoji} to title`}
                      onClick={() => insertEmoji(emoji, "title")}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-lg hover:border-amber-400/40 hover:bg-amber-950/30"
                    >
                      {emoji}
                    </button>
                    <button
                      type="button"
                      title={`Add ${emoji} to message`}
                      onClick={() => insertEmoji(emoji, "body")}
                      className="rounded px-1.5 text-[9px] text-slate-600 hover:text-sky-300"
                    >
                      +msg
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/90">Social media logos</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Sets the notification image (Telegram photo / in-app bell). Official brand icons via Simple Icons CDN.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {NOTIFICATION_SOCIAL_LOGO_LIBRARY.map((logo) => {
            const active = imageUrl === logo.imageUrl;
            return (
              <button
                key={logo.id}
                type="button"
                title={logo.name}
                onClick={() => onImageUrlChange(logo.imageUrl)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors ${
                  active
                    ? "border-sky-400/60 bg-sky-950/50 ring-1 ring-sky-400/30"
                    : "border-white/10 bg-black/25 hover:border-white/25"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.imageUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-md bg-white/10 object-contain p-0.5"
                />
                <span className="text-[9px] text-slate-400">{logo.name}</span>
              </button>
            );
          })}
          {imageUrl ? (
            <button
              type="button"
              onClick={() => onImageUrlChange("")}
              className="rounded-lg border border-rose-500/30 px-3 py-2 text-[10px] text-rose-300 hover:bg-rose-950/30"
            >
              Clear image
            </button>
          ) : null}
        </div>
        {imageUrl ? (
          <p className="mt-2 truncate font-mono text-[10px] text-slate-600" title={imageUrl}>
            {imageUrl}
          </p>
        ) : null}
      </div>
    </div>
  );
}
