'use client';

import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { useGameStore } from '@/utils/game-mechanics';
import { TonConnectManifestHelp } from '@/components/TonConnectManifestHelp';
import { normalizeTonAddress, tonAddressesMatch } from '@/lib/ton-address';

type Props = {
  compact?: boolean;
  className?: string;
};

/** TON Connect button + connected address hint for Play Hub (Drops / Wallet). */
export function PlayTonWalletConnect({ compact = false, className = '' }: Props) {
  const wallet = useTonWallet();
  const tonWalletAddress = useGameStore((s) => s.tonWalletAddress);
  const walletAddr = wallet?.account?.address ? normalizeTonAddress(wallet.account.address) : null;
  const storedAddr = tonWalletAddress ? normalizeTonAddress(tonWalletAddress) : null;
  const connected = walletAddr ?? storedAddr;
  const addressMismatch =
    Boolean(walletAddr && storedAddr) && !tonAddressesMatch(walletAddr, storedAddr);

  if (compact) {
    return (
      <div className={className}>
        <TonConnectButton />
        {connected ? (
          <p className="mt-2 text-center font-mono text-[10px] text-emerald-400/90">{abbrev(connected)}</p>
        ) : (
          <p className="mt-2 text-center text-[10px] text-gray-500">
            Connect to sell PEARLS for TON and verify on-chain tasks.
          </p>
        )}
        {addressMismatch ? (
          <p className="mt-2 text-center text-[10px] text-amber-400/95" role="alert">
            Connected wallet does not match your saved profile address. Disconnect and reconnect, or open support.
          </p>
        ) : null}
        <TonConnectManifestHelp className="mt-2" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-ura-border/85 bg-ura-panel-2 p-4 ${className}`}>
      <p className="text-sm font-semibold text-white">TON wallet</p>
      <p className="mt-1 text-xs font-normal text-gray-400">
        Required for marketplace payouts and on-chain Drops tasks. Your address is saved to your profile.
      </p>
      <div className="mt-3 flex flex-col items-center">
        <TonConnectButton />
        {connected ? (
          <p className="mt-2 break-all text-center font-mono text-xs text-emerald-400/90">{connected}</p>
        ) : null}
        {addressMismatch ? (
          <p className="mt-2 text-center text-xs text-amber-400/95" role="alert">
            Connected wallet does not match your saved profile address. Disconnect and reconnect, or open support.
          </p>
        ) : null}
      </div>
      <TonConnectManifestHelp className="mt-3" />
    </div>
  );
}

function abbrev(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
