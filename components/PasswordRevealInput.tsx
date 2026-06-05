"use client";

import { useId, useState } from "react";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  /** Passed to `<input>`; include layout (e.g. `mt-1`) here. Always reserves trailing space for the toggle. */
  className?: string;
  /** When true, value is visible on first render (non-secret fields). */
  defaultVisible?: boolean;
  /** `text` shows “Show value” / “Hide value” instead of eye icons. */
  togglePresentation?: "icon" | "text";
};

export function PasswordRevealInput({
  id: idProp,
  value,
  onChange,
  autoComplete = "current-password",
  disabled,
  required,
  minLength,
  placeholder,
  autoFocus,
  className = "",
  defaultVisible = false,
  togglePresentation = "icon",
}: Props) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const [visible, setVisible] = useState(defaultVisible);
  const hideLabel = togglePresentation === "text" ? "Hide value" : "Hide password";
  const showLabel = togglePresentation === "text" ? "Show value" : "Show password";

  return (
    <div className="relative isolate">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`${className} ${togglePresentation === "text" ? "pr-[6.5rem]" : "pr-11"}`.trim()}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        aria-controls={id}
        className={
          togglePresentation === "text"
            ? "absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-medium text-indigo-300 hover:bg-white/5 hover:text-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ura-blue/70 disabled:pointer-events-none disabled:opacity-40"
            : "absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ura-blue/70 disabled:pointer-events-none disabled:opacity-40"
        }
      >
        {togglePresentation === "text" ? (
          visible ? "Hide value" : "Show value"
        ) : visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M3 3l18 18M10.73 10.73a3 3 0 004.54 4.54M9.88 9.88A3 3 0 0112 5c4 0 7.33 6.67 8 10a13.56 13.56 0 01-1.66 3.06" strokeLinecap="round" />
            <path d="M6.61 6.61C4.6 8.06 3.17 10 3 11c1.53 8.13 17.93 8.43 17.07 17" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
