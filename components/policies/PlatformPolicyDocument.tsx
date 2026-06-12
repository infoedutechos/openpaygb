import Link from "next/link";
import type { PlatformPolicyDoc } from "@/lib/platform-policy-content";

type Props = {
  policy: PlatformPolicyDoc;
  children?: React.ReactNode;
};

export function PlatformPolicyDocument({ policy, children }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 pb-24">
      <Link
        href="/"
        className="text-sm font-medium text-cyan-300/90 hover:text-cyan-200 hover:underline"
      >
        ← ODEL HUB home
      </Link>

      <header className="mt-6 border-b border-white/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Policies</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{policy.title}</h1>
        {policy.summary ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{policy.summary}</p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">Last updated: {policy.lastUpdated}</p>
      </header>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-300">
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-semibold text-white">{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 whitespace-pre-wrap">
                {p}
              </p>
            ))}
          </section>
        ))}
        {children}
      </div>

      <nav className="mt-12 flex flex-wrap gap-3 border-t border-white/10 pt-6 text-xs">
        <Link href="/policies/terms" className="text-slate-400 hover:text-cyan-200">
          Terms of Service
        </Link>
        <Link href="/policies/privacy" className="text-slate-400 hover:text-cyan-200">
          Privacy Policy
        </Link>
        <Link href="/policies/risk-disclosure" className="text-slate-400 hover:text-cyan-200">
          Risk Disclosure
        </Link>
        <Link href="/policies/payment-providers" className="text-slate-400 hover:text-cyan-200">
          Payment Providers
        </Link>
        <Link href="/help" className="text-slate-400 hover:text-cyan-200">
          Help
        </Link>
      </nav>
    </article>
  );
}
