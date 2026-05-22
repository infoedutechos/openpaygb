'use client';

import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { normalizeTonAddress } from '@/lib/ton-address';

type Props = {
  className?: string;
  /** `hero` = full card on Dex home; `inline` = compact row on sub-pages */
  variant?: 'hero' | 'inline';
};

/** TON Connect wallet card for Dex Hub (onramp / offramp / landing). */
export function DexWalletConnect({ className = '', variant = 'hero' }: Props) {
  const wallet = useTonWallet();
  const connected = wallet?.account?.address
    ? normalizeTonAddress(wallet.account.address)
    : null;

  if (variant === 'inline') {
    return <DexWalletConnectInline className={className} connected={connected} />;
  }

  return (
    <section
      className={`rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-slate-950/70 p-5 ${className}`}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-violet-200/90">TON wallet</p>
      <p className="mt-2 text-sm text-slate-300">
        Connect your TON Wallet to receive on-chain transfers and prepare for offramp flows. You confirm every
        transaction in the wallet app.
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <TonConnectButton />
        {connected ? (
          <p className="break-all text-center font-mono text-xs text-emerald-400/95">{abbrev(connected)}</p>
        ) : (
          <p className="text-center text-xs text-slate-500">Not connected</p>
        )}
      </div>
    </section>
  );
}

function DexWalletConnectInline({
  className,
  connected,
}: {
  className: string;
  connected: string | null;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-violet-500/25 bg-violet-950/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">TON Wallet</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {connected ? `Connected · ${abbrev(connected)}` : 'Connect to use TON on this hub'}
        </p>
      </div>
      <TonConnectButton />
    </div>
  );
}

function abbrev(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
