"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CopilotMessageContent } from "@/components/platform/CopilotMessageContent";
import { useSupportPanelSettings } from "@/hooks/useSupportPanelSettings";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { PageBackLink } from "@/components/nav/PageBackLink";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  kbCitations?: string[];
};

type RecentChat = {
  id: string;
  title: string;
  hub: string;
  status: string;
  updatedAt: string;
};

const SUGGESTED = [
  {
    label: "Pay tuition",
    prompt: "How do I pay tuition or school fees on ODEL HUB?",
  },
  {
    label: "OpenPayGB Card",
    prompt: "How do I activate an OpenPayGB Card with Mobile Money?",
  },
  {
    label: "Register a school",
    prompt: "How does a school register a workspace on OdelPay?",
  },
  {
    label: "Look something up",
    prompt: "Where can I find help articles and guides?",
  },
] as const;

const SIDE_NAV = [
  { href: "/help?view=library", label: "Library" },
  { href: "/help/guide-admin-schools", label: "Guides" },
  { href: "/developers", label: "Developers" },
  { href: "/policies/terms", label: "Policies" },
] as const;

function hubFromParam(raw: string | null): PlatformHub {
  if (raw === "tuition" || raw === "play" || raw === "admin" || raw === "dex" || raw === "all") return raw;
  return "all";
}

function hasUserMessages(messages: ChatMessage[]) {
  return messages.some((m) => m.role === "user");
}

/**
 * ChatGPT-style Help Center workspace: sidebar (New chat + Recents) + Ask anything main pane.
 */
export default function HelpCenterWorkspace() {
  const searchParams = useSearchParams();
  const hub = hubFromParam(searchParams.get("hub"));
  const view = searchParams.get("view") === "library" ? "library" : "chat";
  const platform = useSupportPanelSettings(true);
  const platformName = platform.platformDisplayName?.trim() || platform.shareDefaultTitle?.trim() || "ODEL HUB";
  const copilotName = platform.copilotAssistantName?.trim() || "ODEL HUB Copilot";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadRecents = useCallback(async () => {
    try {
      const res = await fetch(`/api/platform/chat?list=1&hub=${encodeURIComponent(hub)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { conversations?: RecentChat[] };
      setRecents(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {
      /* ignore */
    }
  }, [hub]);

  const loadActive = useCallback(async () => {
    setBootLoading(true);
    try {
      const res = await fetch(`/api/platform/chat?hub=${encodeURIComponent(hub)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        conversationId?: string | null;
        messages?: ChatMessage[];
      };
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      setMessages([
        {
          role: "assistant",
          content: `Hi — I'm **${copilotName}**. Ask anything about tuition, OpenPayGB, Dex, or school admin.`,
        },
      ]);
    } finally {
      setBootLoading(false);
    }
  }, [hub, copilotName]);

  useEffect(() => {
    void loadActive();
    void loadRecents();
  }, [loadActive, loadRecents]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const openConversation = useCallback(async (id: string) => {
    setBootLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform/chat?conversationId=${encodeURIComponent(id)}&hub=${encodeURIComponent(hub)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Could not open chat");
      const data = (await res.json()) as {
        conversationId?: string;
        messages?: ChatMessage[];
      };
      setConversationId(data.conversationId ?? id);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open chat");
    } finally {
      setBootLoading(false);
    }
  }, [hub]);

  const startNewChat = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/chat?hub=${encodeURIComponent(hub)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "new", hub }),
      });
      if (!res.ok) throw new Error("Could not start chat");
      const data = (await res.json()) as {
        conversationId?: string;
        messages?: ChatMessage[];
      };
      setConversationId(data.conversationId ?? null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setInput("");
      void loadRecents();
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start chat");
    } finally {
      setLoading(false);
    }
  }, [hub, loadRecents]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || loading) return;
      setInput("");
      setError(null);
      setMessages((m) => [...m, { role: "user", content: text }]);
      setLoading(true);
      try {
        const res = await fetch(`/api/platform/chat?hub=${encodeURIComponent(hub)}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            hub,
            conversationId: conversationId ?? undefined,
          }),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as {
          reply?: string;
          conversationId?: string;
          citations?: string[];
        };
        if (data.conversationId) setConversationId(data.conversationId);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              data.reply?.trim() ||
              "Sorry — I could not find an answer. Try rephrasing or browse the Library.",
            kbCitations: data.citations,
          },
        ]);
        void loadRecents();
      } catch {
        setError("Could not reach the help copilot. Please try again.");
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "I'm having trouble connecting. Please try again in a moment, or open **Library** for articles.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, hub, input, loading, loadRecents],
  );

  const inThread = useMemo(() => hasUserMessages(messages), [messages]);

  if (view === "library") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageBackLink href="/help" label="Help chat" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-sky-400/90">Library</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Help articles</h1>
        <p className="mt-2 text-sm text-slate-400">
          Browse the searchable FAQ. Or{" "}
          <Link href="/help" className="text-sky-300 underline-offset-2 hover:underline">
            return to Ask anything
          </Link>
          .
        </p>
        <div className="mt-6">
          {/* Lazy import avoided — keep library as redirect to browse component via dynamic */}
          <HelpLibraryEmbed hub={hub} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-[#0a0e16] text-slate-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-[260px] border-r border-white/10" : "w-0 overflow-hidden border-0"
        } hidden shrink-0 flex-col bg-[#0c111b] transition-[width] md:flex`}
      >
        <div className="flex items-center gap-2 px-3 py-3">
          <Link href="/" className="truncate text-sm font-semibold text-white">
            {platformName}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300"
            aria-label="Collapse sidebar"
          >
            «
          </button>
        </div>

        <div className="px-2">
          <button
            type="button"
            onClick={() => void startNewChat()}
            disabled={loading}
            className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white hover:bg-white/[0.1] disabled:opacity-50"
          >
            <span aria-hidden>✎</span>
            New chat
          </button>
        </div>

        <nav className="mt-3 space-y-0.5 px-2">
          {SIDE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-4 flex min-h-0 flex-1 flex-col px-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recents</p>
          <ul className="mt-1 flex-1 space-y-0.5 overflow-y-auto pb-4">
            {recents.length === 0 ? (
              <li className="px-2 py-2 text-xs text-slate-600">No chats yet</li>
            ) : (
              recents.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => void openConversation(c.id)}
                    className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      conversationId === c.id
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                    title={c.title}
                  >
                    {c.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="border-t border-white/10 px-3 py-3">
          <p className="truncate text-sm font-medium text-slate-200">{copilotName}</p>
          <p className="text-[11px] text-slate-500">Knowledge-base help · no paid AI</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5 md:px-5">
          {!sidebarOpen ? (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="hidden rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 hover:text-white md:inline-flex"
            >
              Menu
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 hover:text-white md:hidden"
          >
            Menu
          </button>
          <p className="text-sm font-medium text-slate-200">{platformName} Help</p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/help?view=library"
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white"
            >
              Library
            </Link>
            <Link href="/" className="rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:text-slate-300">
              Home
            </Link>
          </div>
        </header>

        {/* Mobile sidebar drawer */}
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(280px,88vw)] flex-col bg-[#0c111b] shadow-2xl">
              <div className="flex items-center justify-between px-3 py-3">
                <p className="font-semibold text-white">{platformName}</p>
                <button type="button" className="text-slate-400" onClick={() => setMobileNavOpen(false)}>
                  ✕
                </button>
              </div>
              <div className="px-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    void startNewChat();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white"
                >
                  ✎ New chat
                </button>
              </div>
              <nav className="mt-3 space-y-0.5 px-2">
                {SIDE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <p className="mt-4 px-4 text-[11px] font-semibold uppercase text-slate-500">Recents</p>
              <ul className="flex-1 overflow-y-auto px-2">
                {recents.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full truncate rounded-lg px-3 py-2 text-left text-sm text-slate-400"
                      onClick={() => {
                        setMobileNavOpen(false);
                        void openConversation(c.id);
                      }}
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="relative flex min-h-0 flex-1 flex-col">
          {!inThread ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-10">
              <h1 className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready when you are.
              </h1>
              <p className="mt-3 max-w-md text-center text-sm text-slate-500">
                Ask {copilotName} about tuition, OpenPayGB, Dex, or school admin — answers come from the live knowledge
                base.
              </p>

              <form
                className="mt-8 w-full max-w-2xl"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <div className="flex items-end gap-2 rounded-full border border-white/12 bg-[#141a24] px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)] focus-within:border-sky-500/40">
                  <Link
                    href="/help?view=library"
                    className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-slate-400 hover:bg-white/5 hover:text-white"
                    aria-label="Open library"
                  >
                    +
                  </Link>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Ask anything"
                    className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 disabled:opacity-40"
                    aria-label="Send"
                  >
                    ↑
                  </button>
                </div>
              </form>

              <ul className="mt-6 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
                {SUGGESTED.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      onClick={() => void send(s.prompt)}
                      className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-300 hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8">
                {bootLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
                {messages.map((m, i) => (
                  <div
                    key={m.id ?? `${m.role}-${i}`}
                    className={`mx-auto max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-sky-600/25 text-sky-50"
                        : "mr-auto border border-white/8 bg-[#121822] text-slate-200"
                    }`}
                  >
                    <CopilotMessageContent content={m.content} />
                  </div>
                ))}
                {loading ? <p className="mx-auto max-w-2xl text-sm text-slate-500">Thinking…</p> : null}
              </div>

              <form
                className="border-t border-white/8 px-4 py-3 sm:px-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-white/12 bg-[#141a24] px-3 py-2">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Ask anything."
                    className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="mb-0.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}

          {error ? (
            <p className="px-4 pb-3 text-center text-xs text-rose-400 sm:px-8">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Embedded article browse for Library view — keeps FAQ accessible. */
function HelpLibraryEmbed({ hub }: { hub: PlatformHub }) {
  const [articles, setArticles] = useState<
    Array<{ slug: string; title: string; summary: string; excerpt: string; category: string }>
  >([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/knowledge/articles?hub=${encodeURIComponent(hub)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as {
          articles?: Array<{ slug: string; title: string; summary: string; excerpt: string; category: string }>;
        };
        if (!cancelled) setArticles(Array.isArray(data.articles) ? data.articles : []);
      } catch {
        if (!cancelled) setArticles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hub]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.summary.toLowerCase().includes(needle) ||
        a.excerpt.toLowerCase().includes(needle),
    );
  }, [articles, q]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search articles…"
        className="w-full rounded-xl border border-white/10 bg-[#14171c] px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
      />
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading…</p> : null}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {filtered.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/help/${a.slug}`}
              className="block h-full rounded-xl border border-white/10 bg-[#14171c]/80 p-4 hover:border-sky-500/35"
            >
              <h3 className="text-sm font-semibold text-white">{a.title}</h3>
              <p className="mt-2 line-clamp-3 text-xs text-slate-400">{a.summary || a.excerpt}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">{a.category}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
