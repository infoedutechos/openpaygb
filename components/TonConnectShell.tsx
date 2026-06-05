'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useTonConnectManifestUrl } from '@/hooks/useTonConnectManifestUrl';
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
  const manifestUrl = useTonConnectManifestUrl();
  const uiExtras = useTonConnectUiExtras();

  return (
    <TonConnectUIProvider key={manifestUrl} manifestUrl={manifestUrl} {...uiExtras}>
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
