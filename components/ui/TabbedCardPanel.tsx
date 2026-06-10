"use client";

import { useState } from "react";

export type TabbedCardTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function TabbedCardPanel({
  tabs,
  defaultTabId,
  className = "",
}: {
  tabs: TabbedCardTab[];
  defaultTabId?: string;
  className?: string;
}) {
  const [active, setActive] = useState(defaultTabId ?? tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  if (!current) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(tab.id)}
              className={`min-h-[44px] shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                on
                  ? "bg-gradient-to-r from-cyan-500/25 to-sky-600/20 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="rounded-xl border border-[var(--border)] bg-black/15 p-4 sm:p-5">
        {current.content}
      </div>
    </div>
  );
}
