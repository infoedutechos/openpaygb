/** Checkout must stay reachable even if Dex hub is hidden/maintenance. Chrome is owned by MerchantCheckoutClient for white-label. */
export default function OpgbCheckoutLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#05070f] text-slate-100">{children}</div>;
}
