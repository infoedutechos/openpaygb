import {
  isTonConnectAnalyticsNoise,
  isTonConnectBridgeConsoleNoise,
  isTonConnectWalletsListFetchNoise,
  isNextDevConsoleNoise,
} from "@/lib/tonconnect-ui-options";
const GLOBAL_KEY = "__odelhubTonConnectConsoleQuietInstalled";

function shouldSuppressConsoleArgs(args: unknown[]): boolean {
  const text = args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) return `${a.message} ${a.stack ?? ""}`;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
  if (isTonConnectBridgeConsoleNoise(text)) return true;
  const errArg = args.find((a) => a instanceof Error);
  if (isTonConnectWalletsListFetchNoise(errArg ?? text)) return true;
  if (isTonConnectAnalyticsNoise(errArg ?? text)) return true;
  return isNextDevConsoleNoise(text);
}

function shouldSuppressLogArgs(args: unknown[]): boolean {
  const text = args
    .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : String(a)))
    .join(" ");
  return isTonConnectBridgeConsoleNoise(text) || isNextDevConsoleNoise(text);
}

/** Install before TonConnectUIProvider mounts — SDK logs wallet-list fetch errors on first paint. */
export function installTonConnectConsoleQuiet(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { [GLOBAL_KEY]?: boolean };
  if (w[GLOBAL_KEY]) return;
  w[GLOBAL_KEY] = true;

  const wrap =
    (original: typeof console.error) =>
    (...args: unknown[]) => {
      if (shouldSuppressConsoleArgs(args)) return;
      original.apply(console, args as Parameters<typeof console.error>);
    };

  const wrapLog =
    (original: typeof console.log) =>
    (...args: unknown[]) => {
      if (shouldSuppressLogArgs(args)) return;
      original.apply(console, args as Parameters<typeof console.log>);
    };

  console.error = wrap(console.error);
  console.warn = wrap(console.warn);
  console.log = wrapLog(console.log);
}

if (typeof window !== "undefined") {
  installTonConnectConsoleQuiet();
}
