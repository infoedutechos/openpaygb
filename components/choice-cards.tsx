import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

/** URA Pearl shell: navy base, gold + sky blue accents (aligned with ura-pearl-data-center). */
const glassBase =
  "rounded-2xl border text-center backdrop-blur-md transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ura-blue/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ura-page";

export const choiceCardBase = `${glassBase} shadow-[0_0_28px_-8px_rgba(95,168,255,0.22)]`;

export const choiceCardOff = [
  "border-ura-border bg-gradient-to-br from-ura-surface/90 to-ura-navy/95",
  "hover:border-ura-blue/35 hover:shadow-[0_0_32px_-4px_rgba(95,168,255,0.2)] hover:from-ura-surface-2/90",
].join(" ");

export const choiceCardOn = [
  "border-ura-blue/50 bg-gradient-to-br from-ura-blue/18 via-ura-gold/12 to-ura-navy/90",
  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_36px_-4px_rgba(95,168,255,0.38)] ring-1 ring-ura-blue/30",
].join(" ");

export function choiceToggleClass(selected: boolean) {
  return `${choiceCardBase} ${selected ? choiceCardOn : choiceCardOff}`;
}

/** Navigation / marketing cards (home, etc.). */
export const choiceNavCard = [
  glassBase,
  "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 border-ura-border-subtle bg-gradient-to-br from-ura-surface/85 to-ura-navy/95 px-4 py-3",
  "text-center shadow-[0_0_32px_-10px_rgba(31,63,143,0.35)]",
  "hover:border-ura-blue/40 hover:shadow-[0_0_40px_-6px_rgba(95,168,255,0.25)]",
  "focus-visible:ring-ura-blue/80",
].join(" ");

export const choiceNavCardPrimary = [
  glassBase,
  "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 border-ura-gold/45 bg-gradient-to-br from-ura-blue/25 via-ura-gold/20 to-ura-navy/95 px-4 py-3",
  "font-semibold text-white shadow-[0_0_40px_-6px_rgba(243,186,47,0.35)]",
  "hover:border-ura-gold/65 hover:shadow-[0_0_48px_-4px_rgba(95,168,255,0.35)]",
].join(" ");

export const choiceNavCardAmber = [
  glassBase,
  "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 border-ura-gold/40 bg-gradient-to-br from-ura-elevated/95 via-ura-gold/15 to-ura-navy/95 px-4 py-3",
  "font-semibold text-ura-gold shadow-[0_0_36px_-8px_rgba(243,186,47,0.3)]",
  "hover:border-ura-gold/60 hover:text-ura-white hover:shadow-[0_0_44px_-4px_rgba(243,186,47,0.38)]",
].join(" ");

export const choiceActionCard = [
  "inline-flex items-center justify-center rounded-2xl border border-ura-border bg-ura-surface/80 px-4 py-2.5 text-sm font-semibold text-slate-200",
  "shadow-[0_0_24px_-10px_rgba(95,168,255,0.18)] backdrop-blur-md transition-all duration-300",
  "hover:border-ura-blue/45 hover:bg-ura-surface-2/90 hover:shadow-[0_0_32px_-6px_rgba(95,168,255,0.22)]",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ura-blue/70",
].join(" ");

export const choicePrimaryCta = [
  "w-full rounded-2xl border border-ura-gold/50 py-3.5 text-sm font-bold uppercase tracking-wide text-[#0a1628] progress-gradient",
  "shadow-[0_0_40px_-8px_rgba(243,186,47,0.45),inset_0_1px_0_0_rgba(255,255,255,0.2)]",
  "transition-all duration-300 hover:brightness-105 hover:shadow-[0_0_48px_-4px_rgba(95,168,255,0.4)]",
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ura-gold",
].join(" ");

export const choiceSuccessCta = [
  "w-full rounded-2xl border border-emerald-400/45 bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white",
  "shadow-[0_0_40px_-8px_rgba(52,211,153,0.45),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
  "transition-all duration-300 hover:from-emerald-500 hover:shadow-[0_0_44px_-4px_rgba(52,211,153,0.55)]",
  "disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
].join(" ");

export const choiceSecondaryCta = [
  "rounded-2xl border border-ura-border bg-ura-surface/85 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200",
  "shadow-[0_0_24px_-12px_rgba(95,168,255,0.18)] backdrop-blur-sm transition-all duration-300",
  "hover:border-ura-blue/45 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ura-blue/55",
].join(" ");

export const choiceEmeraldOutline = [
  "inline-flex items-center rounded-2xl border border-emerald-400/45 bg-emerald-950/40 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-100",
  "shadow-[0_0_28px_-10px_rgba(52,211,153,0.3)] backdrop-blur-md transition-all duration-300",
  "hover:border-emerald-300/60 hover:bg-emerald-900/50 hover:shadow-[0_0_36px_-6px_rgba(52,211,153,0.4)]",
].join(" ");

export const choiceCompactEmerald = [
  "inline-flex items-center rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white",
  "shadow-[0_0_28px_-8px_rgba(52,211,153,0.45)] transition-all duration-300 hover:from-emerald-500 hover:shadow-[0_0_36px_-4px_rgba(52,211,153,0.55)]",
  "disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
].join(" ");

export const choiceCompactNav = [
  "inline-flex items-center rounded-xl border border-ura-border bg-ura-elevated/80 px-3 py-2 text-sm text-ura-blue/95",
  "shadow-[0_0_20px_-10px_rgba(95,168,255,0.22)] backdrop-blur-md transition-all duration-300",
  "hover:border-ura-blue/45 hover:text-white hover:shadow-[0_0_28px_-6px_rgba(95,168,255,0.28)]",
].join(" ");

export const choiceCompactNavAmber = [
  "inline-flex items-center rounded-xl border border-ura-gold/45 bg-ura-elevated/90 px-3 py-2 text-sm text-ura-gold",
  "shadow-[0_0_24px_-10px_rgba(243,186,47,0.22)] backdrop-blur-md transition-all duration-300",
  "hover:border-ura-gold/65 hover:text-ura-white hover:shadow-[0_0_32px_-6px_rgba(243,186,47,0.32)]",
].join(" ");

export const choiceFilterChip = (active: boolean) =>
  [
    choiceCardBase,
    "min-w-[5.5rem] px-3 py-2 text-xs font-bold uppercase tracking-wider",
    active ? choiceCardOn : choiceCardOff,
  ].join(" ");

type ChoiceCardButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function ChoiceCardButton({ selected = false, className = "", children, ...rest }: ChoiceCardButtonProps) {
  return (
    <button type="button" className={`${choiceToggleClass(selected)} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

type ChoiceLinkCardProps = {
  href: string;
  variant?: "default" | "primary" | "amber";
  className?: string;
  children: ReactNode;
};

export function ChoiceLinkCard({ href, variant = "default", className = "", children }: ChoiceLinkCardProps) {
  const v =
    variant === "primary" ? choiceNavCardPrimary : variant === "amber" ? choiceNavCardAmber : choiceNavCard;
  return (
    <Link href={href} className={`${v} ${className}`.trim()}>
      {children}
    </Link>
  );
}
