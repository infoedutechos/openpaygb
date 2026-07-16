'use client';

import { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { isClientFetchNetworkError } from '@/lib/client-fetch-error';
import {
  isTonConnectAbortNoise,
  isTonConnectAnalyticsNoise,
  isTonConnectBridgeConsoleNoise,
  isTonConnectWalletsListFetchNoise,
} from '@/lib/tonconnect-ui-options';

const MANIFEST_HELP =
  'TON wallet could not load this app. Check your network, enable automatic date/time, or clear Telegram cache. Open the app from the same URL your admin configured.';

function isBenignTonConnectAbort(reason: unknown, msg: string): boolean {
  if (isTonConnectAbortNoise(reason) || isTonConnectAbortNoise(msg)) return true;
  return (
    msg.includes('Operation aborted') ||
    msg.includes('NS_ERROR_ABORT') ||
    (msg.includes('TonConnect') && msg.toLowerCase().includes('abort') && !msg.toLowerCase().includes('manifest'))
  );
}

function isProviderNotSet(msg: string): boolean {
  return (
    msg.includes('TonConnectProviderNotSetError') ||
    /TonConnectUIProvider.*top of the app/i.test(msg)
  );
}

function isManifestRelated(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('manifest') ||
    lower.includes('ton_connect_sdk_error') ||
    (lower.includes('tonconnect') && lower.includes('fetch'))
  );
}

type Props = {
  children: React.ReactNode;
  onManifestError?: (message: string) => void;
};

/** Surfaces manifest failures; suppresses only benign user-abort noise. */
export function TonConnectErrorHandler({ children, onManifestError }: Props) {
  const showToast = useToast();

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message ?? String(event.reason ?? '');
      const benign =
        !msg ||
        isBenignTonConnectAbort(event.reason, msg) ||
        isTonConnectBridgeConsoleNoise(msg) ||
        isTonConnectWalletsListFetchNoise(event.reason) ||
        isTonConnectAnalyticsNoise(event.reason) ||
        (process.env.NODE_ENV === "development" && isClientFetchNetworkError(event.reason));
      if (benign) {
        if (msg) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (isProviderNotSet(msg)) {
        console.error('[TonConnect]', msg);
        showToast(
          'TON wallet provider is not ready. Refresh the page. If this persists, restart the dev server.',
          'error',
        );
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (isManifestRelated(msg)) {
        const detail = process.env.NODE_ENV === 'development' ? msg : MANIFEST_HELP;
        console.error('[TonConnect]', msg);
        showToast(detail, 'error');
        onManifestError?.(msg);
        if (process.env.NODE_ENV !== 'development') {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (msg.includes('TON_CONNECT_SDK_ERROR')) {
        console.warn('[TonConnect]', msg);
        if (process.env.NODE_ENV === 'development') {
          showToast(msg, 'error');
        }
      }
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, [onManifestError, showToast]);

  return <>{children}</>;
}
