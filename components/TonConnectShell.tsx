'use client';

import '@/lib/tonconnect-console-quiet-install';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useTonConnectConnector } from '@/hooks/useTonConnectConnector';
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

function TonConnectShellInner({
  children,
  syncWallet = false,
  showManifestHelp = true,
}: Props) {
  const manifestUrl = useTonConnectManifestUrl();
  const connector = useTonConnectConnector(manifestUrl);
  const uiExtras = useTonConnectUiExtras();

  if (!connector) {
    return (
      <ToastProvider>
        {children}
      </ToastProvider>
    );
  }

  return (
    <TonConnectUIProvider key={manifestUrl} connector={connector} restoreConnection {...uiExtras}>
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

export function TonConnectShell(props: Props) {
  return <TonConnectShellInner {...props} />;
}
