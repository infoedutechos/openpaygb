'use client';

import { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { isTonConnectBridgeConsoleNoise } from '@/lib/tonconnect-ui-options';

const MANIFEST_HELP =
  'TON wallet could not load this app. Check your network, enable automatic date/time, or clear Telegram cache. Open the app from the same URL your admin configured.';

function isBenignTonConnectAbort(msg: string): boolean {
  return (
    msg.includes('Operation aborted') ||
    (msg.includes('TonConnect') && msg.toLowerCase().includes('abort') && !msg.toLowerCase().includes('manifest'))
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
      if (!msg || isBenignTonConnectAbort(msg) || isTonConnectBridgeConsoleNoise(msg)) {
        if (isBenignTonConnectAbort(msg) || isTonConnectBridgeConsoleNoise(msg)) {
          event.preventDefault();
          event.stopPropagation();
        }
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
