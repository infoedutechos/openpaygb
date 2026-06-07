import Link from "next/link";
import {
  checkoutTopupHref,
  INSUFFICIENT_FUNDS_MESSAGE,
  type CheckoutTopupRail,
} from "@/lib/checkout-insufficient-funds";

type Props = {
  rail: CheckoutTopupRail;
  returnPath?: string;
  className?: string;
};

export function InsufficientFundsTopupCallout({ rail, returnPath, className = "" }: Props) {
  const href = checkoutTopupHref(rail, returnPath);
  const topupLabel = rail === "ton" ? "Top up TON" : "Top up mobile money";

  return (
    <div
      className={`rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100 ${className}`}
      role="alert"
    >
      <p>{INSUFFICIENT_FUNDS_MESSAGE}</p>
      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1 font-semibold text-cyan-300 underline-offset-2 hover:text-cyan-200 hover:underline"
      >
        {topupLabel}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
