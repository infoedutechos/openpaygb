'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlatformSocial } from '@/components/PlatformSocialProvider';
import { linksForSupport } from "@/lib/site-ui-shared";
import { triggerHapticFeedback } from '@/utils/ui';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function openExternalUrl(url: string) {
  if (typeof window === 'undefined') return;
  const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (u: string, o?: { try_instant_view?: boolean }) => void } } })
    .Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url, { try_instant_view: false });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

const INTRO_ASSISTANT: ChatMessage = {
  role: 'assistant',
  content:
    'Hi — I’m here to answer questions about **URAPearls** and how to use the app and **URA Services** links.\n\nIf you’re stuck or want a person, tap **talk to an agent** anytime.',
};

export type SupportChatWidgetProps = {
  /** `clicker` clears the bottom tab bar; `landing` uses standard safe-area inset */
  placement?: 'landing' | 'clicker';
};

export default function SupportChatWidget({ placement = 'landing' }: SupportChatWidgetProps) {
  const platform = usePlatformSocial();
  const supportLinks = linksForSupport(platform.socialLinks);
  const supportPhoneDisplay = platform.supportPhone.trim() || '0800 117 000';
  const supportPhoneHref = `tel:${(platform.supportPhone || '0800117000').replace(/\s/g, '')}`;
  const supportEmail = platform.supportEmail.trim() || null;

  const [open, setOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_ASSISTANT]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    triggerHapticFeedback(window);
    setInput('');
    setError(null);
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        throw new Error('Request failed');
      }
      const data = (await res.json()) as { reply?: string };
      const reply = data.reply?.trim() || 'Sorry — I could not generate a reply. Try **talk to an agent**.';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setError('Could not reach the assistant. Please try again or use talk to an agent.');
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            'I’m having trouble connecting. You can still reach our team with **talk to an agent** below.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const bottomClass =
    placement === 'clicker'
      ? 'bottom-[calc(6.85rem+env(safe-area-inset-bottom,0px))]'
      : 'bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))]';

  return (
    <div
      className={`pointer-events-none fixed z-[90] flex flex-col items-end gap-2 ${bottomClass} right-[max(1.25rem,env(safe-area-inset-right,0px))]`}
    >
      {open ? (
        <div
          className="pointer-events-auto w-[min(100vw-1.5rem,22rem)] max-h-[min(70vh,32rem)] flex flex-col rounded-2xl border border-white/10 bg-[#14171c] shadow-[0_12px_40px_rgba(0,0,0,0.55)] overflow-hidden"
          role="dialog"
          aria-label="Support chat"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-r from-sky-600/90 to-indigo-700/90 border-b border-white/10">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">URAPearls Help</p>
              <p className="text-[10px] text-white/80 truncate">Chat · Agent handoff below</p>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setOpen(false);
                setAgentOpen(false);
              }}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-white/90 hover:bg-white/15"
            >
              Close
            </button>
          </div>

          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2 text-[13px] leading-snug">
            {messages.map((msg, i) => (
              <div
                key={`${i}-${msg.role}`}
                className={`rounded-xl px-2.5 py-2 ${
                  msg.role === 'user'
                    ? 'ml-6 bg-sky-600/25 text-sky-50 border border-sky-500/25'
                    : 'mr-4 bg-white/[0.06] text-slate-100 border border-white/[0.07]'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {loading ? (
              <div className="mr-4 rounded-xl px-2.5 py-2 bg-white/[0.06] border border-white/[0.07] text-slate-400 text-xs">
                Thinking…
              </div>
            ) : null}
            {error ? <p className="text-[11px] text-amber-300/95 px-1">{error}</p> : null}
          </div>

          <div className="border-t border-white/10 px-2 py-2 space-y-2 bg-ura-navy-deep/90">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setAgentOpen((v) => !v);
              }}
              className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/15 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 transition-colors"
            >
              {agentOpen ? 'Hide agent options' : 'Not satisfied? talk to an agent'}
            </button>

            {agentOpen ? (
              <div className="rounded-xl border border-white/10 bg-[#161a20] p-2.5 space-y-2 text-[11px] text-slate-300">
                <p className="text-slate-400">
                  Choose how to reach us. For game or account issues, messaging the bot is often fastest.
                </p>
                <div className="flex flex-col gap-1.5">
                  {supportLinks.map((link) => (
                    <button
                      key={link.key}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(window);
                        openExternalUrl(link.url.trim());
                      }}
                      className="rounded-lg bg-[#229ED9]/20 border border-[#229ED9]/40 py-2 px-2 text-left font-medium text-sky-200 hover:bg-[#229ED9]/30"
                    >
                      {link.label}
                    </button>
                  ))}
                  <a
                    href={supportPhoneHref}
                    onClick={() => triggerHapticFeedback(window)}
                    className="rounded-lg bg-white/[0.06] border border-white/10 py-2 px-2 text-left font-medium text-white hover:bg-white/10"
                  >
                    Call {supportPhoneDisplay}
                  </a>
                  {supportEmail ? (
                    <a
                      href={`mailto:${supportEmail}`}
                      onClick={() => triggerHapticFeedback(window)}
                      className="rounded-lg bg-white/[0.06] border border-white/10 py-2 px-2 text-left font-medium text-white hover:bg-white/10 break-all"
                    >
                      Email {supportEmail}
                    </a>
                  ) : null}
                  <a
                    href="https://www.ura.go.ug/en/contact-us/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => triggerHapticFeedback(window)}
                    className="rounded-lg bg-white/[0.06] border border-white/10 py-2 px-2 text-left font-medium text-slate-200 hover:bg-white/10"
                  >
                    URA contact (official)
                  </a>
                </div>
              </div>
            ) : null}

            <div className="flex gap-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask a question…"
                className="flex-1 min-w-0 rounded-xl bg-[#1a1d24] border border-[#2d323c] px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
                autoComplete="off"
                aria-label="Message"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:pointer-events-none px-3 py-2 text-xs font-bold text-white"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          triggerHapticFeedback(window);
          setOpen((o) => !o);
          if (open) setAgentOpen(false);
        }}
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white pl-4 pr-1 py-1.5 shadow-[0_6px_28px_rgba(14,165,233,0.45)] ring-2 ring-cyan-200/55 ring-offset-2 ring-offset-[#0a0c0f] border border-white/20 hover:brightness-110 hover:shadow-[0_8px_32px_rgba(34,211,238,0.5)] active:scale-[0.97] transition-all motion-safe:animate-pulse-soft"
        aria-expanded={open}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        <span className="text-sm font-bold tracking-tight drop-shadow-sm">Help</span>
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ura-navy/30 text-[1.35rem] leading-none"
          aria-hidden
        >
          💬
        </span>
      </button>
    </div>
  );
}
