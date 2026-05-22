import type { WalletsListConfiguration } from "@tonconnect/ui";

/**
 * Wallets with stable HTTP bridges for local dev.
 * Omitting Tomo / Mirai / Nicegram bridges avoids CORS + 522 console spam on localhost.
 */
export const LOCAL_DEV_TON_WALLETS: NonNullable<WalletsListConfiguration["includeWallets"]> = [
  {
    appName: "tonkeeper",
    name: "Tonkeeper",
    imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
    aboutUrl: "https://tonkeeper.com",
    universalLink: "https://app.tonkeeper.com/ton-connect",
    deepLink: "tonkeeper-tc://",
    bridgeUrl: "https://bridge.tonapi.io/bridge",
    platforms: ["ios", "android", "chrome", "firefox", "windows", "macos", "linux"],
  },
  {
    appName: "mytonwallet",
    name: "MyTonWallet",
    imageUrl: "https://static.mytonwallet.io/icon-256.png",
    aboutUrl: "https://mytonwallet.io",
    universalLink: "https://connect.mytonwallet.org",
    bridgeUrl: "https://tonconnectbridge.mytonwallet.org/bridge/",
    platforms: ["chrome", "windows", "macos", "linux", "ios", "android"],
  },
  {
    appName: "telegram-wallet",
    name: "Wallet in Telegram",
    imageUrl: "https://wallet.tg/images/logo-288.png",
    aboutUrl: "https://wallet.tg",
    universalLink: "https://t.me/wallet?attach=wallet",
    bridgeUrl: "https://walletbot.me/tonconnect-bridge/bridge",
    platforms: ["ios", "android", "macos", "windows", "linux"],
  },
];

export function isLocalTonConnectHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
