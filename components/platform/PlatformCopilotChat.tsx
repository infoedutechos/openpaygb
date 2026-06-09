"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupportPanelSettings } from "@/hooks/useSupportPanelSettings";
import { buildSupportPanelView } from "@/lib/support-panel-display";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { CopilotMessageContent } from "@/components/platform/CopilotMessageContent";
import { HelpCopilotBubbleIcon } from "@/components/platform/HelpCopilotBubbleIcon";
import { PLATFORM_CHAT_OPEN_EVENT } from "@/lib/platform-chat-events";
import { triggerHapticFeedback } from "@/utils/ui";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  kbCitations?: string[];
};

function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { openLink?: (u: string, o?: { try_instant_view?: boolean }) => void } };
    }
  ).Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url, { try_instant_view: false });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export type PlatformCopilotChatProps = {
  hub?: PlatformHub;
  placement?: "landing" | "clicker" | "compact";
  title?: string;
  subtitle?: string;
};

export default function PlatformCopilotChat({
  hub = "all",
  placement = "landing",
  title,
  subtitle,
}: PlatformCopilotChatProps) {
  const [open, setOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const platform = useSupportPanelSettings(agentOpen || open);
  const support = buildSupportPanelView(platform);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copilotName = platform.copilotAssistantName?.trim() || "ODEL HUB Copilot";
  const platformName = platform.shareDefaultTitle?.trim() || "ODEL HUB";
  const chatTitle = title ?? `${platformName} Help`;
  const chatSubtitle = subtitle ?? copilotName;

  const loadHistory = useCallback(async () => {
    setBootLoading(true);
    try {
      const res = await fetch(`/api/platform/chat?hub=${encodeURIComponent(hub)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        conversationId?: string;
        messages?: ChatMessage[];
      };
      if (data.conversationId) setConversationId(data.conversationId);
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      }
    } catch {
      setMessages([
        {
          role: "assistant",
          content: `Hi — I'm **${copilotName}** on ${platformName}. Ask about tuition, school registration, payments, or URAPearls.`,
        },
      ]);
    } finally {
      setBootLoading(false);
    }
  }, [hub, copilotName, platformName]);

  useEffect(() => {
    if (!open) return;
    const q = input.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/platform/chat/suggest?hub=${encodeURIComponent(hub)}&q=${encodeURIComponent(q)}`,
          );
          if (!res.ok) return;
          const data = (await res.json()) as { suggestions?: string[] };
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        } catch {
          setSuggestions([]);
        }
      })();
    }, 280);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [input, hub, open]);

  useEffect(() => {
    const openFromSidebar = () => setOpen(true);
    window.addEventListener(PLATFORM_CHAT_OPEN_EVENT, openFromSidebar);
    return () => window.removeEventListener(PLATFORM_CHAT_OPEN_EVENT, openFromSidebar);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadHistory();
  }, [open, loadHistory]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    triggerHapticFeedback(window);
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/chat?hub=${encodeURIComponent(hub)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, hub, conversationId: conversationId ?? undefined }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as {
        reply?: string;
        conversationId?: string;
        citations?: string[];
      };
      if (data.conversationId) setConversationId(data.conversationId);
      const reply =
        data.reply?.trim() ||
        "Sorry — I could not find an answer. Try **Talk to an agent** or rephrase your question.";
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply, kbCitations: data.citations },
      ]);
    } catch {
      setError("Could not reach ODEL HUB Copilot. Please try again or use Talk to an agent.");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "ODEL HUB Copilot is having trouble connecting. You can still reach our team with **Talk to an agent** below.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, hub, input, loading]);

  const bottomClass =
    placement === "clicker"
      ? "bottom-[calc(6.85rem+env(safe-area-inset-bottom,0px))]"
      : placement === "compact"
        ? "bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        : "bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))]";

  return (
    <div
      className={`pointer-events-none fixed z-[90] flex flex-col items-end gap-2 ${bottomClass} right-[max(1.25rem,env(safe-area-inset-right,0px))]`}
    >
      {open ? (
        <div
          className="pointer-events-auto w-[min(100vw-1.5rem,22rem)] max-h-[min(70vh,32rem)] flex flex-col rounded-2xl border border-white/10 bg-[#14171c] shadow-[0_12px_40px_rgba(0,0,0,0.55)] overflow-hidden"
          role="dialog"
          aria-label="Help chat"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-r from-sky-600/90 to-indigo-700/90 border-b border-white/10">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{chatTitle}</p>
              <p className="text-[10px] text-white/80 truncate">{chatSubtitle}</p>
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

          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2 text-[13px] leading-snug"
          >
            {bootLoading && messages.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">Loading chat…</div>
            ) : null}
            {messages.map((msg, i) => (
              <div
                key={msg.id ?? `${i}-${msg.role}`}
                className={`rounded-xl px-2.5 py-2 ${
                  msg.role === "user"
                    ? "ml-6 bg-sky-600/25 text-sky-50 border border-sky-500/25"
                    : "mr-4 bg-white/[0.06] text-slate-100 border border-white/[0.07]"
                }`}
              >
                <CopilotMessageContent content={msg.content} />
              </div>
            ))}
            {loading ? (
              <div className="mr-4 rounded-xl px-2.5 py-2 bg-white/[0.06] border border-white/[0.07] text-slate-400 text-xs">
                {copilotName} is typing…
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
              {agentOpen ? "Hide agent options" : "Not satisfied? Talk to an agent"}
            </button>

            {agentOpen ? (
              <div className="rounded-xl border border-white/10 bg-[#161a20] p-2.5 space-y-2 text-[11px] text-slate-300">
                <p className="text-slate-400">Choose how to reach us for account-specific help.</p>
                <div className="flex flex-col gap-1.5">
                  {support.socialLinks.map((link) => (
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
                  {support.showCommunitySupport && support.communitySupportUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(window);
                        openExternalUrl(support.communitySupportUrl!);
                      }}
                      className="rounded-lg bg-[#25D366]/15 border border-[#25D366]/40 py-2 px-2 text-left font-medium text-emerald-200 hover:bg-[#25D366]/25"
                    >
                      Community Support
                    </button>
                  ) : null}
                  {support.showSupportPhone ? (
                    <a
                      href={support.supportPhoneHref}
                      onClick={() => triggerHapticFeedback(window)}
                      className="rounded-lg bg-white/[0.06] border border-white/10 py-2 px-2 text-left font-medium text-white hover:bg-white/10"
                    >
                      Call {support.supportPhoneDisplay}
                    </a>
                  ) : null}
                  {support.showSupportEmail && support.supportEmail ? (
                    <a
                      href={`mailto:${support.supportEmail}`}
                      onClick={() => triggerHapticFeedback(window)}
                      className="rounded-lg bg-white/[0.06] border border-white/10 py-2 px-2 text-left font-medium text-white hover:bg-white/10 break-all"
                    >
                      Email {support.supportEmail}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      setSuggestions([]);
                    }}
                    className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex gap-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
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
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white pl-4 pr-1 py-1.5 shadow-[0_6px_28px_rgba(14,165,233,0.45)] ring-2 ring-cyan-200/55 ring-offset-2 ring-offset-[#0a0c0f] border border-white/20 hover:brightness-110 active:scale-[0.97] transition-all"
        aria-expanded={open}
        aria-label={open ? "Close help chat" : "Open help chat"}
      >
        <span className="text-sm font-bold tracking-tight drop-shadow-sm">Help</span>
        <HelpCopilotBubbleIcon />
      </button>
    </div>
  );
}
