"use client";

import { useState } from "react";

/** Small copy-to-clipboard control for secrets and IDs. */
export function CopyTextButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className={
        className ||
        "rounded-md border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
      }
    >
      {copied ? "Copied" : label}
    </button>
  );
}
