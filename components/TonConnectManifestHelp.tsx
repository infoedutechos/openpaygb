'use client';

import { useEffect, useState } from 'react';
import { getTonConnectManifestUrl } from '@/lib/tonconnect-manifest-url';

type Props = {
  className?: string;
};

/** Shown when manifest preflight detects a mismatch — mirrors TON Wallet support guidance. */
export function TonConnectManifestHelp({ className = '' }: Props) {
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
    const url = getTonConnectManifestUrl(origin);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const body = (await res.json()) as { url?: string };
        if (!res.ok) {
          if (!cancelled) setDetail(`Manifest HTTP ${res.status}`);
          return;
        }
        const manifestOrigin = body.url?.replace(/\/$/, '');
        if (manifestOrigin && manifestOrigin !== origin) {
          if (!cancelled) {
            setDetail(`Manifest url (${manifestOrigin}) does not match this page (${origin}).`);
          }
        } else if (!cancelled) {
          setDetail(null);
        }
      } catch (e) {
        if (!cancelled) {
          setDetail(e instanceof Error ? e.message : 'Could not load TON Connect manifest');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!detail) return null;

  return (
    <div
      className={`rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-100/95 ${className}`}
      role="alert"
    >
      <p className="font-semibold text-amber-200">TON Connect setup issue</p>
      <p className="mt-1 font-mono text-[10px] opacity-90">{detail}</p>
      <ul className="mt-2 list-disc pl-4 space-y-1 text-amber-100/80">
        <li>Use the same URL your school or admin gave you (not a different host or port).</li>
        <li>Switch Wi‑Fi / mobile data and enable automatic date &amp; time.</li>
        <li>In Telegram: clear cache, reopen the mini-app, then connect again.</li>
        <li>
          See{' '}
          <a
            href="https://help.wallet.tg/article/281-ton-connect-and-how-to-connect-apps"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            TON Wallet help
          </a>
          .
        </li>
      </ul>
    </div>
  );
}
