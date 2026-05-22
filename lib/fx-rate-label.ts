/** Human-readable label for FX `source` codes returned by `lib/fx`. */
export function formatFxRateSource(source: string | undefined): string {
  if (!source?.trim()) return "rate";

  if (source.startsWith("market_median")) {
    const n = source.match(/_(\d+)$/)?.[1];
    return n ? `live market median (${n} sources)` : "live market median";
  }

  switch (source) {
    case "coingecko":
      return "live market rate (CoinGecko)";
    case "cryptocompare":
      return "live market rate (CryptoCompare)";
    case "tonapi":
      return "live market rate (TonAPI)";
    case "coingecko_usd_ugx":
      return "live rate (CoinGecko USD cross)";
    case "cryptocompare_usd_ugx":
      return "live rate (CryptoCompare USD cross)";
    case "binance_usdt_ugx":
      return "live rate (Binance USD cross)";
    case "tonapi_usd_ugx":
      return "live rate (TonAPI USD cross)";
    case "db":
      return "stored rate";
    case "seed":
    case "manual":
      return "configured rate";
    case "platform_fixed":
      return "platform fixed rate (master)";
    case "org_fixed":
      return "school fixed rate (master)";
    case "platform_buffer_pct":
      return "platform rate (live median + buffer)";
    case "org_buffer_pct":
      return "school rate (live median + buffer)";
    case "env_default":
      return "default rate";
    default:
      return source.replace(/_/g, " ");
  }
}
