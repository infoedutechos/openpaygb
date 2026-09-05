"use client";

type Props = {
  onBack: () => void;
  title: string;
  subtitle?: string;
  /** Optional trailing control (e.g. close). */
  trailing?: React.ReactNode;
};

/** Shared header for school student action modals — back arrow + title. */
export function SchoolModalHeader({ onBack, title, subtitle, trailing }: Props) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 hover:text-white"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {trailing}
    </div>
  );
}
