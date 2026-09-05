"use client";

type Props = {
  onBack: () => void;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  /** Dark overlays (admin) vs light sheets (OpenPay card). */
  variant?: "dark" | "light";
};

/** Shared ← Back header for modals and action sheets. */
export function ModalHeader({ onBack, title, subtitle, trailing, variant = "dark" }: Props) {
  const dark = variant === "dark";
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className={
          dark
            ? "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 hover:text-white"
            : "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <h2 className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
        {subtitle ? (
          <p className={`mt-0.5 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

type NextProps = {
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

/** Primary forward control for multi-step flows. */
export function ModalNextButton({
  onClick,
  label = "Next",
  disabled,
  className = "",
  type = "button",
}: NextProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 ${className}`}
    >
      <span>{label}</span>
      <span aria-hidden>→</span>
    </button>
  );
}
