'use client';

import { useMemo } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { getTonConnectManifestUrl } from '@/lib/tonconnect-manifest-url';
import { useTonConnectUiExtras } from '@/hooks/useTonConnectUiExtras';
import { TonConnectBridgeConsoleQuiet } from '@/components/TonConnectBridgeConsoleQuiet';
import { TonConnectErrorHandler } from '@/components/TonConnectErrorHandler';
import { TonConnectManifestHelp } from '@/components/TonConnectManifestHelp';
import { TonWalletSync } from '@/components/TonWalletSync';
import { ToastProvider } from '@/contexts/ToastContext';

type Props = {
  children: React.ReactNode;
  /** When true, runs TonWalletSync (Play Hub only). */
  syncWallet?: boolean;
  showManifestHelp?: boolean;
};

export function TonConnectShell({ children, syncWallet = false, showManifestHelp = true }: Props) {
  const manifestUrl = useMemo(
    () => getTonConnectManifestUrl(typeof window !== 'undefined' ? window.location.origin : undefined),
    [],
  );

  const uiExtras = useTonConnectUiExtras();

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl} {...uiExtras}>
      <TonConnectBridgeConsoleQuiet />
      <ToastProvider>
        <TonConnectErrorHandler>
          {syncWallet ? <TonWalletSync /> : null}
          {showManifestHelp ? <TonConnectManifestHelp className="mx-3 mt-2" /> : null}
          {children}
        </TonConnectErrorHandler>
      </ToastProvider>
    </TonConnectUIProvider>
  );
}
