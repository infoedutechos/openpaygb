export type TonConnectManifestBody = {
  url: string;
  name: string;
  iconUrl: string;
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
};

export function buildTonConnectManifest(origin: string): TonConnectManifestBody {
  const base = origin.replace(/\/$/, "");
  return {
    url: base,
    name: "ODEL HUB Pay",
    iconUrl: `${base}/api/manifest/tonconnect-icon`,
    termsOfUseUrl: `${base}/clicker/terms`,
    privacyPolicyUrl: `${base}/clicker/privacy`,
  };
}
